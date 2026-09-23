import { createFileRoute } from "@tanstack/react-router";

import {
	EXTRAS_RESPONSE_HEADERS,
	getExtras,
} from "../../../features/extras/extras.server";

export const Route = createFileRoute("/api/v1/extras")({
	server: {
		handlers: {
			GET: async () =>
				Response.json(await getExtras(), {
					headers: EXTRAS_RESPONSE_HEADERS,
				}),
		},
	},
});
