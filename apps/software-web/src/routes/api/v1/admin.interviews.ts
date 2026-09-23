import { createFileRoute } from "@tanstack/react-router";
import {
	listAdminInterviews,
	parseAdminInterviewCursor,
} from "../../../features/admin/admin.server";
import {
	ADMIN_RESPONSE_HEADERS,
	adminErrorResponse,
	hasValidCurationToken,
	parseAdminLimit,
	unauthorizedAdminResponse,
} from "../../../features/admin/admin-api.server";

export const Route = createFileRoute("/api/v1/admin/interviews")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				if (!hasValidCurationToken(request)) {
					return unauthorizedAdminResponse();
				}

				const url = new URL(request.url);
				const limit = parseAdminLimit(url.searchParams.get("limit"));
				const cursorValue = url.searchParams.get("cursor");
				const cursor = cursorValue
					? parseAdminInterviewCursor(cursorValue)
					: null;
				const queryValue = url.searchParams.get("query");
				const query = queryValue?.trim() || null;

				if (limit === null) {
					return adminErrorResponse(
						400,
						"invalid_limit",
						"limit must be an integer from 1 through 200.",
					);
				}

				if (cursorValue && !cursor) {
					return adminErrorResponse(
						400,
						"invalid_cursor",
						"The interview cursor is invalid.",
					);
				}

				if (query && query.length > 200) {
					return adminErrorResponse(
						400,
						"invalid_query",
						"query must contain at most 200 characters.",
					);
				}

				try {
					return Response.json(
						await listAdminInterviews({ limit, query, cursor }),
						{ headers: ADMIN_RESPONSE_HEADERS },
					);
				} catch (error) {
					console.error(
						JSON.stringify({
							message: "Listing interviews failed.",
							error: error instanceof Error ? error.message : "Unknown error",
						}),
					);

					return adminErrorResponse(
						500,
						"interview_list_failed",
						"Listing interviews failed.",
					);
				}
			},
		},
	},
});
