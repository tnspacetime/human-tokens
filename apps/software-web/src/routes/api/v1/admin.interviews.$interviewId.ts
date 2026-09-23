import { createFileRoute } from "@tanstack/react-router";
import { getAdminInterview } from "../../../features/admin/admin.server";
import {
	ADMIN_RESPONSE_HEADERS,
	adminErrorResponse,
	hasValidCurationToken,
	UUID_PATTERN,
	unauthorizedAdminResponse,
} from "../../../features/admin/admin-api.server";

export const Route = createFileRoute("/api/v1/admin/interviews/$interviewId")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
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

				try {
					const response = await getAdminInterview(params.interviewId);

					if (!response) {
						return adminErrorResponse(
							404,
							"interview_not_found",
							"The interview was not found.",
						);
					}

					return Response.json(response, { headers: ADMIN_RESPONSE_HEADERS });
				} catch (error) {
					console.error(
						JSON.stringify({
							message: "Loading an interview failed.",
							error: error instanceof Error ? error.message : "Unknown error",
						}),
					);

					return adminErrorResponse(
						500,
						"interview_load_failed",
						"Loading the interview failed.",
					);
				}
			},
		},
	},
});
