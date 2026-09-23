import { createFileRoute } from "@tanstack/react-router";

import {
	getLatestPublication,
	PUBLIC_LATEST_RESPONSE_HEADERS,
} from "../../../features/publications/publication.server";

export const Route = createFileRoute("/api/v1/latest")({
	server: {
		handlers: {
			GET: async () =>
				Response.json(await getLatestPublication(), {
					headers: PUBLIC_LATEST_RESPONSE_HEADERS,
				}),
		},
	},
});
