export const DRAFT_RESPONSE_HEADERS = {
	"Cache-Control": "no-store",
	"Cloudflare-CDN-Cache-Control": "no-store",
	"Referrer-Policy": "no-referrer",
	Vary: "Cookie",
	"X-Robots-Tag": "noindex, nofollow",
} as const;

export const DRAFT_UNAVAILABLE_HEADERS = {
	...DRAFT_RESPONSE_HEADERS,
	"Content-Type": "text/html; charset=utf-8",
} as const;
