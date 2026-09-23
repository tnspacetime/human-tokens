import { createFileRoute } from "@tanstack/react-router";
import {
	getPublicGuests,
	PUBLIC_GUESTS_DEFAULT_LIMIT,
	PUBLIC_GUESTS_MAX_LIMIT,
	parsePublicGuestsCursor,
} from "../../../features/guests/guests.server";
import { PUBLIC_GUESTS_RESPONSE_HEADERS } from "../../../features/guests/guests-cache";

function getLimit(request: Request) {
	const value = new URL(request.url).searchParams.get("limit");
	const parsed = value
		? Number.parseInt(value, 10)
		: PUBLIC_GUESTS_DEFAULT_LIMIT;

	if (!Number.isInteger(parsed) || parsed < 1) {
		return PUBLIC_GUESTS_DEFAULT_LIMIT;
	}

	return Math.min(parsed, PUBLIC_GUESTS_MAX_LIMIT);
}

export const Route = createFileRoute("/api/v1/guests")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);

				return Response.json(
					await getPublicGuests({
						limit: getLimit(request),
						cursor: parsePublicGuestsCursor(url.searchParams.get("cursor")),
					}),
					{
						headers: PUBLIC_GUESTS_RESPONSE_HEADERS,
					},
				);
			},
		},
	},
});
