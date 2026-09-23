import { createFileRoute } from "@tanstack/react-router";
import {
	getContributionAuthoringCookieName,
	serializeContributionAuthoringCookie,
} from "../../../features/contribution/contribution.server";
import { normalizeContributionLinkId } from "../../../features/contribution/contribution-identifiers";
import {
	readContributionPortraitImage,
	storeContributionPortraitImage,
} from "../../../features/contribution/contribution-portrait-image.server";
import { CONTRIBUTION_RESPONSE_HEADERS } from "../../../features/contribution/contribution-response";

const MAX_PORTRAIT_IMAGE_BYTES = 8 * 1024 * 1024;
const SUPPORTED_CONTENT_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
]);

function errorResponse(
	status: number,
	code: string,
	message: string,
	additionalHeaders?: Record<string, string>,
) {
	return Response.json(
		{ version: "1", error: { code, message } },
		{
			status,
			headers: {
				...CONTRIBUTION_RESPONSE_HEADERS,
				...additionalHeaders,
			},
		},
	);
}

function hasSameOrigin(request: Request) {
	const origin = request.headers.get("Origin");

	if (!origin) {
		return false;
	}

	try {
		return new URL(origin).origin === new URL(request.url).origin;
	} catch {
		return false;
	}
}

function readCookie(request: Request, name: string) {
	const cookieHeader = request.headers.get("Cookie");

	if (!cookieHeader) {
		return null;
	}

	for (const part of cookieHeader.split(/;\s*/)) {
		const separatorIndex = part.indexOf("=");

		if (separatorIndex !== -1 && part.slice(0, separatorIndex) === name) {
			return part.slice(separatorIndex + 1);
		}
	}

	return null;
}

function unavailableResponse(linkId: string | null) {
	return errorResponse(
		401,
		"contribution_unavailable",
		"Contribution access is unavailable.",
		linkId
			? {
					"Set-Cookie": serializeContributionAuthoringCookie({
						linkId,
						rawToken: "",
						maxAge: 0,
					}),
				}
			: undefined,
	);
}

function hasExpectedImageSignature(contentType: string, data: ArrayBuffer) {
	const bytes = new Uint8Array(data);

	if (contentType === "image/jpeg") {
		return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
	}

	if (contentType === "image/png") {
		return (
			bytes[0] === 0x89 &&
			bytes[1] === 0x50 &&
			bytes[2] === 0x4e &&
			bytes[3] === 0x47 &&
			bytes[4] === 0x0d &&
			bytes[5] === 0x0a &&
			bytes[6] === 0x1a &&
			bytes[7] === 0x0a
		);
	}

	return (
		contentType === "image/webp" &&
		bytes[0] === 0x52 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46 &&
		bytes[3] === 0x46 &&
		bytes[8] === 0x57 &&
		bytes[9] === 0x45 &&
		bytes[10] === 0x42 &&
		bytes[11] === 0x50
	);
}

export const Route = createFileRoute(
	"/api/v1/contribution/$linkId/portrait-image",
)({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const linkId = normalizeContributionLinkId(params.linkId);
				const rawToken = linkId
					? readCookie(request, getContributionAuthoringCookieName(linkId))
					: null;

				if (!linkId || !rawToken) {
					return unavailableResponse(linkId);
				}

				try {
					const result = await readContributionPortraitImage({
						linkId,
						rawToken,
					});

					if (result.status === "unavailable") {
						return unavailableResponse(linkId);
					}

					if (result.status === "missing") {
						return errorResponse(
							404,
							"portrait_image_not_found",
							"No interview photo has been uploaded.",
						);
					}

					const headers = new Headers();
					result.object.writeHttpMetadata(headers);
					for (const [name, value] of Object.entries(
						CONTRIBUTION_RESPONSE_HEADERS,
					)) {
						headers.set(name, value);
					}
					headers.set("Content-Length", String(result.object.size));
					headers.set("ETag", result.object.httpEtag);
					headers.set("X-Content-Type-Options", "nosniff");

					return new Response(result.object.body, { headers });
				} catch (error) {
					console.error(
						JSON.stringify({
							message: "Reading a contribution interview photo failed.",
							error: error instanceof Error ? error.message : "Unknown error",
						}),
					);

					return errorResponse(
						500,
						"portrait_image_read_failed",
						"Reading the interview photo failed.",
					);
				}
			},
			PUT: async ({ request, params }) => {
				if (!hasSameOrigin(request)) {
					return errorResponse(
						403,
						"origin_mismatch",
						"The request origin is not allowed.",
					);
				}

				const linkId = normalizeContributionLinkId(params.linkId);
				const rawToken = linkId
					? readCookie(request, getContributionAuthoringCookieName(linkId))
					: null;

				if (!linkId || !rawToken) {
					return unavailableResponse(linkId);
				}

				const contentType = request.headers
					.get("Content-Type")
					?.split(";", 1)[0]
					?.trim()
					.toLowerCase();

				if (!contentType || !SUPPORTED_CONTENT_TYPES.has(contentType)) {
					return errorResponse(
						415,
						"unsupported_portrait_image",
						"The interview photo must be a JPEG, PNG, or WebP file.",
					);
				}

				const contentLength = request.headers.get("Content-Length");

				if (
					contentLength &&
					(!/^\d+$/.test(contentLength) ||
						Number.parseInt(contentLength, 10) > MAX_PORTRAIT_IMAGE_BYTES)
				) {
					return errorResponse(
						413,
						"portrait_image_too_large",
						"The interview photo must be 8 MB or smaller.",
					);
				}

				let data: ArrayBuffer;

				try {
					data = await request.arrayBuffer();
				} catch {
					return errorResponse(
						400,
						"invalid_portrait_image",
						"The interview photo could not be read.",
					);
				}

				if (
					data.byteLength === 0 ||
					data.byteLength > MAX_PORTRAIT_IMAGE_BYTES
				) {
					return errorResponse(
						data.byteLength === 0 ? 400 : 413,
						data.byteLength === 0
							? "invalid_portrait_image"
							: "portrait_image_too_large",
						data.byteLength === 0
							? "The interview photo is empty."
							: "The interview photo must be 8 MB or smaller.",
					);
				}

				if (!hasExpectedImageSignature(contentType, data)) {
					return errorResponse(
						400,
						"invalid_portrait_image",
						"The file contents do not match its image type.",
					);
				}

				try {
					const result = await storeContributionPortraitImage({
						linkId,
						rawToken,
						contentType,
						data,
					});

					if (result.status === "unavailable") {
						return unavailableResponse(linkId);
					}

					return Response.json(
						{
							version: "1",
							item: {
								url: `/api/v1/contribution/${linkId}/portrait-image`,
								etag: result.etag,
							},
						},
						{ headers: CONTRIBUTION_RESPONSE_HEADERS },
					);
				} catch (error) {
					console.error(
						JSON.stringify({
							message: "Storing a contribution interview photo failed.",
							error: error instanceof Error ? error.message : "Unknown error",
						}),
					);

					return errorResponse(
						500,
						"portrait_image_upload_failed",
						"Uploading the interview photo failed.",
					);
				}
			},
		},
	},
});
