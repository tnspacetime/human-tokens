import { createFileRoute } from "@tanstack/react-router";
import { readShareSnapshotPortrait } from "../features/share-snapshots/share-snapshot.server";
import {
	getShareSnapshotHeaders,
	SHARE_SNAPSHOT_NOT_FOUND_HEADERS,
} from "../features/share-snapshots/share-snapshot-cache";
import { isValidShareId } from "../features/share-snapshots/share-snapshot-identifiers";

function notFoundResponse() {
	return new Response("Portrait not found.", {
		status: 404,
		headers: SHARE_SNAPSHOT_NOT_FOUND_HEADERS,
	});
}

function getPortraitHeaders(shareId: string, object: R2ObjectBody) {
	const headers = new Headers();
	object.writeHttpMetadata(headers);

	for (const [name, value] of Object.entries(
		getShareSnapshotHeaders(shareId),
	)) {
		headers.set(name, value);
	}

	headers.set("Content-Length", String(object.size));
	headers.set("ETag", object.httpEtag);
	headers.set("X-Content-Type-Options", "nosniff");

	return headers;
}

export const Route = createFileRoute("/share/$shareId/portrait")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				if (!isValidShareId(params.shareId)) {
					return notFoundResponse();
				}

				try {
					const object = await readShareSnapshotPortrait(params.shareId);

					if (!object) {
						return notFoundResponse();
					}

					return new Response(object.body, {
						headers: getPortraitHeaders(params.shareId, object),
					});
				} catch (error) {
					console.error(
						JSON.stringify({
							message: "Reading a share snapshot portrait failed.",
							shareId: params.shareId,
							error: error instanceof Error ? error.message : "Unknown error",
						}),
					);

					return new Response("Reading the portrait failed.", {
						status: 500,
						headers: SHARE_SNAPSHOT_NOT_FOUND_HEADERS,
					});
				}
			},
		},
	},
});
