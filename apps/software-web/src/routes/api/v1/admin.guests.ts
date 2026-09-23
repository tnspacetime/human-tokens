import { createFileRoute } from "@tanstack/react-router";
import {
	createAdminGuest,
	listAdminGuests,
	parseAdminGuestCursor,
} from "../../../features/admin/admin.server";
import {
	ADMIN_RESPONSE_HEADERS,
	adminErrorResponse,
	hasValidCurationToken,
	parseAdminLimit,
	unauthorizedAdminResponse,
} from "../../../features/admin/admin-api.server";

function parseCreateGuestRequest(value: unknown) {
	if (
		typeof value !== "object" ||
		value === null ||
		Object.keys(value).some((key) => key !== "name" && key !== "description") ||
		!("name" in value) ||
		!("description" in value) ||
		typeof value.name !== "string" ||
		typeof value.description !== "string"
	) {
		return null;
	}

	const name = value.name.trim();
	const description = value.description.trim();

	if (!name || !description) {
		return null;
	}

	return { name, description };
}

export const Route = createFileRoute("/api/v1/admin/guests")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				if (!hasValidCurationToken(request)) {
					return unauthorizedAdminResponse();
				}

				const url = new URL(request.url);
				const limit = parseAdminLimit(url.searchParams.get("limit"));
				const cursorValue = url.searchParams.get("cursor");
				const cursor = cursorValue ? parseAdminGuestCursor(cursorValue) : null;
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
						"The guest cursor is invalid.",
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
						await listAdminGuests({ limit, query, cursor }),
						{ headers: ADMIN_RESPONSE_HEADERS },
					);
				} catch (error) {
					console.error(
						JSON.stringify({
							message: "Listing guests failed.",
							error: error instanceof Error ? error.message : "Unknown error",
						}),
					);

					return adminErrorResponse(
						500,
						"guest_list_failed",
						"Listing guests failed.",
					);
				}
			},
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

				const input = parseCreateGuestRequest(requestBody);

				if (!input) {
					return adminErrorResponse(
						400,
						"invalid_request",
						"name and description must be non-empty strings.",
					);
				}

				try {
					return Response.json(
						{ version: "1", item: await createAdminGuest(input) },
						{ status: 201, headers: ADMIN_RESPONSE_HEADERS },
					);
				} catch (error) {
					console.error(
						JSON.stringify({
							message: "Creating a guest failed.",
							error: error instanceof Error ? error.message : "Unknown error",
						}),
					);

					return adminErrorResponse(
						500,
						"guest_creation_failed",
						"Creating the guest failed.",
					);
				}
			},
		},
	},
});
