import { env } from "cloudflare:workers";
import { createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_RESPONSE_HEADERS = {
	"Cache-Control": "no-store",
	"Cloudflare-CDN-Cache-Control": "no-store",
	"Referrer-Policy": "no-referrer",
	"X-Robots-Tag": "noindex, nofollow",
} as const;

export const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function hasValidCurationToken(request: Request) {
	const authorization = request.headers.get("Authorization");
	const [scheme, providedToken, extra] =
		authorization?.trim().split(/\s+/) ?? [];

	if (
		scheme?.toLowerCase() !== "bearer" ||
		!providedToken ||
		extra ||
		!env.CURATION_API_TOKEN
	) {
		return false;
	}

	const providedHash = createHash("sha256").update(providedToken).digest();
	const expectedHash = createHash("sha256")
		.update(env.CURATION_API_TOKEN)
		.digest();

	return timingSafeEqual(providedHash, expectedHash);
}

export function adminErrorResponse(
	status: number,
	code: string,
	message: string,
	additionalHeaders?: Record<string, string>,
) {
	return Response.json(
		{
			version: "1",
			error: { code, message },
		},
		{
			status,
			headers: {
				...ADMIN_RESPONSE_HEADERS,
				...additionalHeaders,
			},
		},
	);
}

export function unauthorizedAdminResponse() {
	return adminErrorResponse(401, "unauthorized", "Unauthorized.", {
		"WWW-Authenticate": "Bearer",
	});
}

export function parseAdminLimit(
	value: string | null,
	{ defaultLimit = 100, maxLimit = 200 } = {},
) {
	if (value === null) {
		return defaultLimit;
	}

	if (!/^\d+$/.test(value)) {
		return null;
	}

	const parsed = Number.parseInt(value, 10);

	if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maxLimit) {
		return null;
	}

	return parsed;
}
