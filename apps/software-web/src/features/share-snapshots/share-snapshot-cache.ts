import {
	BROWSER_REVALIDATE_CACHE_CONTROL,
	LONG_LIVED_EDGE_CACHE_CONTROL,
} from "../cache/cache-policy";

export const SHARE_SNAPSHOT_ROBOTS_DIRECTIVE = "noindex, nofollow";

export const SHARE_SNAPSHOT_NOT_FOUND_HEADERS: Record<string, string> = {
	"Cache-Control": "no-store",
	"Cloudflare-CDN-Cache-Control": "no-store",
	"X-Robots-Tag": SHARE_SNAPSHOT_ROBOTS_DIRECTIVE,
};

export function getShareSnapshotCacheTag(shareId: string) {
	return `share-snapshot-${shareId}`;
}

export function getShareSnapshotHeaders(shareId: string) {
	return {
		"Cache-Control": BROWSER_REVALIDATE_CACHE_CONTROL,
		"Cloudflare-CDN-Cache-Control": LONG_LIVED_EDGE_CACHE_CONTROL,
		"Cache-Tag": getShareSnapshotCacheTag(shareId),
		"X-Robots-Tag": SHARE_SNAPSHOT_ROBOTS_DIRECTIVE,
	};
}
