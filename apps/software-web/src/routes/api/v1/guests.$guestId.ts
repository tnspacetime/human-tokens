import { createFileRoute } from "@tanstack/react-router";
import { getPublicGuest } from "../../../features/guests/guests.server";
import type { PublicGuestErrorResponse } from "../../../features/guests/guests.types";
import {
	getPublicGuestResponseHeaders,
	PUBLIC_GUEST_NOT_FOUND_HEADERS,
} from "../../../features/guests/guests-cache";

const notFoundResponse = () =>
	Response.json(
		{
			version: "1",
			error: {
				code: "not_found",
				message: "Guest not found.",
			},
		} satisfies PublicGuestErrorResponse,
		{
			status: 404,
			headers: PUBLIC_GUEST_NOT_FOUND_HEADERS,
		},
	);

export const Route = createFileRoute("/api/v1/guests/$guestId")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const response = await getPublicGuest(params.guestId);

				if (!response) {
					return notFoundResponse();
				}

				return Response.json(response, {
					headers: getPublicGuestResponseHeaders(params.guestId),
				});
			},
		},
	},
});
