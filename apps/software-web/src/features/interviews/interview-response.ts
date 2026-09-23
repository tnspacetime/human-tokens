import {
	getPublishedInterviewCacheTag,
	PUBLISHED_BROWSER_CACHE_CONTROL,
	PUBLISHED_EDGE_CACHE_CONTROL,
} from "../publications/publication-cache";

export const INTERVIEW_ROBOTS_DIRECTIVE = "noindex, nofollow";

export const PUBLIC_INTERVIEWS_RESPONSE_HEADERS: Record<string, string> = {
	"Cache-Control": "public, max-age=0",
	"Cloudflare-CDN-Cache-Control":
		"public, max-age=300, stale-while-revalidate=3600",
	"Cache-Tag": "interviews,interview-list,api-interviews",
	"X-Robots-Tag": INTERVIEW_ROBOTS_DIRECTIVE,
};

export const INTERVIEWS_BAD_REQUEST_HEADERS: Record<string, string> = {
	"Cache-Control": "no-store",
	"Cloudflare-CDN-Cache-Control": "no-store",
	"X-Robots-Tag": INTERVIEW_ROBOTS_DIRECTIVE,
};

export const INTERVIEW_NOT_FOUND_HEADERS: Record<string, string> = {
	"Cache-Control": "no-store",
	"X-Robots-Tag": INTERVIEW_ROBOTS_DIRECTIVE,
};

export function getPublishedInterviewHeaders(publicId: string) {
	return {
		"Cache-Control": PUBLISHED_BROWSER_CACHE_CONTROL,
		"Cloudflare-CDN-Cache-Control": PUBLISHED_EDGE_CACHE_CONTROL,
		"Cache-Tag": `interviews,${getPublishedInterviewCacheTag(publicId)}`,
		"X-Robots-Tag": INTERVIEW_ROBOTS_DIRECTIVE,
	};
}
