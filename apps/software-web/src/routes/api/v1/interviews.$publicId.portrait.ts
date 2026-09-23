import { createFileRoute } from "@tanstack/react-router";
import { readPublicInterviewPortrait } from "../../../features/interviews/interview-portrait.server";
import { isValidInterviewPublicId } from "../../../features/interviews/interview-public";
import { INTERVIEW_NOT_FOUND_HEADERS } from "../../../features/interviews/interview-response";
import type { PublicPublicationErrorResponse } from "../../../features/publications/publication.types";
import {
	getPublishedInterviewCacheTag,
	PUBLISHED_BROWSER_CACHE_CONTROL,
	PUBLISHED_EDGE_CACHE_CONTROL,
} from "../../../features/publications/publication-cache";

function notFoundResponse() {
	return Response.json(
		{
			version: "1",
			error: {
				code: "not_found",
				message: "Interview portrait not found.",
			},
		} satisfies PublicPublicationErrorResponse,
		{
			status: 404,
			headers: INTERVIEW_NOT_FOUND_HEADERS,
		},
	);
}

function getPortraitHeaders(publicId: string, object: R2ObjectBody) {
	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set("Cache-Control", PUBLISHED_BROWSER_CACHE_CONTROL);
	headers.set("Cloudflare-CDN-Cache-Control", PUBLISHED_EDGE_CACHE_CONTROL);
	headers.set(
		"Cache-Tag",
		`interviews,${getPublishedInterviewCacheTag(publicId)},interview-portrait-${publicId}`,
	);
	headers.set("Content-Length", String(object.size));
	headers.set("ETag", object.httpEtag);
	headers.set("X-Content-Type-Options", "nosniff");
	headers.set("X-Robots-Tag", "noindex, nofollow");

	return headers;
}

export const Route = createFileRoute("/api/v1/interviews/$publicId/portrait")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				if (!isValidInterviewPublicId(params.publicId)) {
					return notFoundResponse();
				}

				try {
					const object = await readPublicInterviewPortrait(params.publicId);

					if (!object) {
						return notFoundResponse();
					}

					return new Response(object.body, {
						headers: getPortraitHeaders(params.publicId, object),
					});
				} catch (error) {
					console.error(
						JSON.stringify({
							message: "Reading a public interview portrait failed.",
							publicId: params.publicId,
							error: error instanceof Error ? error.message : "Unknown error",
						}),
					);

					return Response.json(
						{
							version: "1",
							error: {
								code: "portrait_read_failed",
								message: "Reading the interview portrait failed.",
							},
						},
						{
							status: 500,
							headers: INTERVIEW_NOT_FOUND_HEADERS,
						},
					);
				}
			},
		},
	},
});
