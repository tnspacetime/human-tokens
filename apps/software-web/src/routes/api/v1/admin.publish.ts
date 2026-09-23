import { createFileRoute } from "@tanstack/react-router";

import {
	ADMIN_RESPONSE_HEADERS,
	adminErrorResponse,
	hasValidCurationToken,
	UUID_PATTERN,
	unauthorizedAdminResponse,
} from "../../../features/admin/admin-api.server";
import { publishPublication } from "../../../features/publications/publication.server";

function parsePublishRequest(value: unknown) {
	if (
		typeof value !== "object" ||
		value === null ||
		!("scheme" in value) ||
		typeof value.scheme !== "string"
	) {
		return { status: "invalid_scheme" } as const;
	}

	if (value.scheme !== "pair") {
		return { status: "unsupported_scheme" } as const;
	}

	if (
		!("interviewId" in value) ||
		!("backgroundReadingId" in value) ||
		typeof value.interviewId !== "string" ||
		typeof value.backgroundReadingId !== "string" ||
		!UUID_PATTERN.test(value.interviewId) ||
		!UUID_PATTERN.test(value.backgroundReadingId)
	) {
		return { status: "invalid_pair" } as const;
	}

	return {
		status: "valid" as const,
		input: {
			interviewId: value.interviewId,
			backgroundReadingId: value.backgroundReadingId,
		},
	};
}

export const Route = createFileRoute("/api/v1/admin/publish")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				if (!hasValidCurationToken(request)) {
					return unauthorizedAdminResponse();
				}

				let requestBody: unknown;

				try {
					requestBody = await request.json();
				} catch {
					return adminErrorResponse(
						400,
						"invalid_request",
						"The request body must be valid JSON.",
					);
				}

				const input = parsePublishRequest(requestBody);

				if (input.status === "invalid_scheme") {
					return adminErrorResponse(
						400,
						"invalid_request",
						"scheme must be a string.",
					);
				}

				if (input.status === "unsupported_scheme") {
					return adminErrorResponse(
						400,
						"unsupported_publish_scheme",
						"The requested publish scheme is not supported.",
					);
				}

				if (input.status === "invalid_pair") {
					return adminErrorResponse(
						400,
						"invalid_request",
						"For the pair scheme, interviewId and backgroundReadingId must be UUIDs.",
					);
				}

				try {
					const result = await publishPublication(input.input);

					if (result.status === "not_found") {
						return adminErrorResponse(
							404,
							"not_found",
							"The interview or background reading was not found.",
						);
					}

					if (result.status === "not_ready") {
						return adminErrorResponse(
							409,
							"content_not_ready",
							"The interview and background reading must both be ready before publishing.",
						);
					}

					if (result.status === "incomplete") {
						return adminErrorResponse(
							422,
							"content_incomplete",
							"The ready content is incomplete and cannot be published.",
						);
					}

					return Response.json(result.response, {
						headers: ADMIN_RESPONSE_HEADERS,
					});
				} catch (error) {
					console.error(
						JSON.stringify({
							message: "Publishing content failed.",
							error: error instanceof Error ? error.message : "Unknown error",
						}),
					);

					return adminErrorResponse(
						500,
						"publish_failed",
						"Publishing failed.",
					);
				}
			},
		},
	},
});
