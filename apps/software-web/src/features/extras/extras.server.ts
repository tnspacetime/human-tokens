import { env } from "cloudflare:workers";

import type { ExtrasResponse } from "./extras.types";

export const EXTRAS_RESPONSE_HEADERS = {
	"Cache-Control": "public, max-age=60, stale-while-revalidate=300",
} as const;

export const SOFTWARE_EXTRAS_KV_KEY = "extras:v1";

export async function getExtras(): Promise<ExtrasResponse> {
	return (
		(await env.HUMAN_TOKENS_SOFTWARE_EXTRAS.get<ExtrasResponse>(
			SOFTWARE_EXTRAS_KV_KEY,
			"json",
		)) ?? {
			version: "1",
			announcement: null,
			specialItems: [],
		}
	);
}
