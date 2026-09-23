import { createFileRoute } from "@tanstack/react-router";

import {
	ADMIN_RESPONSE_HEADERS,
	adminErrorResponse,
	hasValidCurationToken,
	UUID_PATTERN,
	unauthorizedAdminResponse,
} from "../../../features/admin/admin-api.server";
import { createShareSnapshot } from "../../../features/share-snapshots/share-snapshot.server";
import type { ShareSnapshotKind } from "../../../features/share-snapshots/share-snapshot.types";

type CreateShareSnapshotRequest = {
	kind: ShareSnapshotKind;
	sourceId: string;
};

function parseCreateShareSnapshotRequest(
	value: unknown,
): CreateShareSnapshotRequest | null {
	if (
		typeof value !== "object" ||
		value === null ||
		Object.keys(value).some((key) => key !== "kind" && key !== "sourceId") ||
		!("kind" in value) ||
		!("sourceId" in value) ||
		(value.kind !== "interview" && value.kind !== "background_reading") ||
		typeof value.sourceId !== "string" ||
		!UUID_PATTERN.test(value.sourceId)
	) {
		return null;
	}

	return { kind: value.kind, sourceId: value.sourceId };
}

export const Route = createFileRoute("/api/v1/admin/share-snapshots")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				if (!hasValidCurationToken(request)) {
					return unauthorizedAdminResponse();
				}

				let requestBody: unknown;

				try {
					requestBody = await request.json();
				} catch {
					return adminErrorResponse(
						400,
						"invalid_request",
						"The request body must be valid JSON.",
					);
				}

				const input = parseCreateShareSnapshotRequest(requestBody);

				if (!input) {
					return adminErrorResponse(
						400,
						"invalid_request",
						"kind must be interview or background_reading, and sourceId must be a UUID.",
					);
				}

				try {
					const result = await createShareSnapshot(input);

					if (result.status === "not_found") {
						return adminErrorResponse(
							404,
							"source_not_found",
							"The interview or background reading was not found.",
						);
					}

					if (result.status === "incomplete") {
						return adminErrorResponse(
							422,
							"content_incomplete",
							"The source content is incomplete and cannot be shared.",
						);
					}

					return Response.json(
						{
							version: "1",
							snapshotId: result.snapshotId,
							kind: result.kind,
							shareUrl: new URL(
								`/share/${result.shareId}`,
								request.url,
							).toString(),
							createdAt: result.createdAt.toISOString(),
						},
						{ status: 201, headers: ADMIN_RESPONSE_HEADERS },
					);
				} catch (error) {
					console.error(
						JSON.stringify({
							message: "Creating a share snapshot failed.",
							error: error instanceof Error ? error.message : "Unknown error",
						}),
					);

					return adminErrorResponse(
						500,
						"share_snapshot_creation_failed",
						"Creating the share snapshot failed.",
					);
				}
			},
		},
	},
});
