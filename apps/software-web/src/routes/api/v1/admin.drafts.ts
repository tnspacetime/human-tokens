import { createFileRoute } from "@tanstack/react-router";

import {
	ADMIN_RESPONSE_HEADERS,
	adminErrorResponse,
	hasValidCurationToken,
	unauthorizedAdminResponse,
} from "../../../features/admin/admin-api.server";
import {
	createDraft,
	type DraftKind,
	isDraftKind,
} from "../../../features/drafts/drafts.server";

type CreateDraftRequest = {
	kind: DraftKind;
	expiresInDays: number;
};

function parseCreateDraftRequest(value: unknown): CreateDraftRequest | null {
	if (
		typeof value !== "object" ||
		value === null ||
		Object.keys(value).some(
			(key) => key !== "kind" && key !== "expiresInDays",
		) ||
		!("kind" in value) ||
		!("expiresInDays" in value) ||
		!isDraftKind(value.kind) ||
		typeof value.expiresInDays !== "number" ||
		!Number.isInteger(value.expiresInDays) ||
		value.expiresInDays <= 0
	) {
		return null;
	}

	return {
		kind: value.kind,
		expiresInDays: value.expiresInDays,
	};
}

export const Route = createFileRoute("/api/v1/admin/drafts")({
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

				const input = parseCreateDraftRequest(requestBody);

				if (!input) {
					return adminErrorResponse(
						400,
						"invalid_request",
						"kind and expiresInDays are required.",
					);
				}

				try {
					const draft = await createDraft(input);
					const draftUrl = new URL(
						`/draft/${draft.rawToken}`,
						request.url,
					).toString();

					return Response.json(
						{
							version: "1",
							draftUrl,
							expiresAt: draft.expiresAt.toISOString(),
							...(input.kind === "interview"
								? { interviewId: draft.targetId }
								: {}),
						},
						{ status: 201, headers: ADMIN_RESPONSE_HEADERS },
					);
				} catch (error) {
					console.error(
						JSON.stringify({
							message: "Creating a draft failed.",
							error: error instanceof Error ? error.message : "Unknown error",
						}),
					);

					return adminErrorResponse(
						500,
						"draft_creation_failed",
						"Creating the draft failed.",
					);
				}
			},
		},
	},
});
