import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import {
	getPublicGuests,
	PUBLIC_GUESTS_MAX_LIMIT,
	parsePublicGuestsCursor,
} from "./guests.server";
import { GUESTS_PAGE_CACHE_HEADERS } from "./guests-cache";

function setHeaders(headers: Record<string, string>) {
	for (const [name, value] of Object.entries(headers)) {
		setResponseHeader(name, value);
	}
}

export const getWebGuestsPage = createServerFn({ method: "GET" })
	.validator((input: unknown) => {
		if (
			typeof input === "object" &&
			input !== null &&
			"cursor" in input &&
			typeof input.cursor === "string"
		) {
			return { cursor: input.cursor };
		}

		return { cursor: null };
	})
	.handler(({ data }) => {
		setHeaders(GUESTS_PAGE_CACHE_HEADERS);

		return getPublicGuests({
			limit: PUBLIC_GUESTS_MAX_LIMIT,
			cursor: parsePublicGuestsCursor(data.cursor),
		});
	});
