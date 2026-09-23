import { createFileRoute } from "@tanstack/react-router";
import { attachGuestToInterview } from "../../../features/admin/admin.server";
import {
	ADMIN_RESPONSE_HEADERS,
	adminErrorResponse,
	hasValidCurationToken,
	UUID_PATTERN,
	unauthorizedAdminResponse,
} from "../../../features/admin/admin-api.server";

function parseAttachGuestRequest(value: unknown) {
	if (
		typeof value !== "object" ||
		value === null ||
		Object.keys(value).some((key) => key !== "guestId") ||
		!("guestId" in value) ||
		typeof value.guestId !== "string" ||
		!UUID_PATTERN.test(value.guestId)
	) {
		return null;
	}

	return { guestId: value.guestId };
}

export const Route = createFileRoute(
	"/api/v1/admin/interviews/$interviewId/guest",
)({
	server: {
		handlers: {
			PUT: async ({ request, params }) => {
				if (!hasValidCurationToken(request)) {
					return unauthorizedAdminResponse();
				}

				if (!UUID_PATTERN.test(params.interviewId)) {
					return adminErrorResponse(
						400,
						"invalid_interview_id",
						"interviewId must be a UUID.",
					);
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

				const input = parseAttachGuestRequest(requestBody);

				if (!input) {
					return adminErrorResponse(
						400,
						"invalid_request",
						"guestId must be a UUID.",
					);
				}

				try {
					const result = await attachGuestToInterview(
						params.interviewId,
						input.guestId,
					);

					if (result.status === "interview_not_found") {
						return adminErrorResponse(
							404,
							"interview_not_found",
							"The interview was not found.",
						);
					}

					if (result.status === "guest_not_found") {
						return adminErrorResponse(
							404,
							"guest_not_found",
							"The guest was not found.",
						);
					}

					return Response.json(
						{ version: "1", item: result.item },
						{ headers: ADMIN_RESPONSE_HEADERS },
					);
				} catch (error) {
					console.error(
						JSON.stringify({
							message: "Attaching a guest to an interview failed.",
							error: error instanceof Error ? error.message : "Unknown error",
						}),
					);

					return adminErrorResponse(
						500,
						"guest_attachment_failed",
						"Attaching the guest to the interview failed.",
					);
				}
			},
		},
	},
});
