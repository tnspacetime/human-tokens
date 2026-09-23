export const PUBLISHED_BROWSER_CACHE_CONTROL = "public, max-age=0";

export const PUBLISHED_EDGE_CACHE_CONTROL =
	"public, max-age=31536000, stale-while-revalidate=604800";

export const HOMEPAGE_CACHE_TAG = "homepage";

export const PUBLISHED_HOMEPAGE_CACHE_HEADERS: Record<string, string> = {
	"Cache-Control": PUBLISHED_BROWSER_CACHE_CONTROL,
	"Cloudflare-CDN-Cache-Control": PUBLISHED_EDGE_CACHE_CONTROL,
	"Cache-Tag": HOMEPAGE_CACHE_TAG,
};

export function getPublicationPublishCachePurge(guestId: string) {
	return {
		homepage: true,
		guestIds: [guestId],
		guestList: true,
	} as const;
}

export function getPublishedInterviewCacheTag(publicId: string) {
	return `interview-${publicId}`;
}
