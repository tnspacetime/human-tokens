import {
	PUBLISHED_BROWSER_CACHE_CONTROL,
	PUBLISHED_EDGE_CACHE_CONTROL,
} from "../publications/publication-cache";

export const GUEST_LIST_CACHE_TAG = "guest-list";

const PUBLIC_GUEST_API_CACHE_HEADERS = {
	"Cache-Control": "public, max-age=0",
	"Cloudflare-CDN-Cache-Control":
		"public, max-age=300, stale-while-revalidate=3600",
	"X-Robots-Tag": "noindex",
} as const;

export function getGuestCacheTag(guestId: string) {
	return `guest-${guestId}`;
}

export const PUBLIC_GUESTS_RESPONSE_HEADERS = {
	...PUBLIC_GUEST_API_CACHE_HEADERS,
	"Cache-Tag": `guests,${GUEST_LIST_CACHE_TAG},api-guests`,
} as const;

export function getPublicGuestResponseHeaders(guestId: string) {
	return {
		...PUBLIC_GUEST_API_CACHE_HEADERS,
		"Cache-Tag": `guests,${getGuestCacheTag(guestId)},api-guests`,
	};
}

export const PUBLIC_GUEST_NOT_FOUND_HEADERS = {
	"Cache-Control": "no-store",
	"Cloudflare-CDN-Cache-Control": "no-store",
	"X-Robots-Tag": "noindex",
} as const;

export const GUESTS_PAGE_CACHE_HEADERS: Record<string, string> = {
	"Cache-Control": PUBLISHED_BROWSER_CACHE_CONTROL,
	"Cloudflare-CDN-Cache-Control": PUBLISHED_EDGE_CACHE_CONTROL,
	"Cache-Tag": `guests,${GUEST_LIST_CACHE_TAG}`,
};
