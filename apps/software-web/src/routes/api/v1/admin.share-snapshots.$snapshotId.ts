import { createFileRoute } from "@tanstack/react-router";

import {
	ADMIN_RESPONSE_HEADERS,
	adminErrorResponse,
	hasValidCurationToken,
	UUID_PATTERN,
	unauthorizedAdminResponse,
} from "../../../features/admin/admin-api.server";
import { revokeShareSnapshot } from "../../../features/share-snapshots/share-snapshot.server";

export const Route = createFileRoute(
	"/api/v1/admin/share-snapshots/$snapshotId",
)({
	server: {
		handlers: {
			DELETE: async ({ request, params }) => {
				if (!hasValidCurationToken(request)) {
					return unauthorizedAdminResponse();
				}

				if (!UUID_PATTERN.test(params.snapshotId)) {
					return adminErrorResponse(
						400,
						"invalid_snapshot_id",
						"snapshotId must be a UUID.",
					);
				}

				try {
					const result = await revokeShareSnapshot(params.snapshotId);

					if (result.status === "not_found") {
						return adminErrorResponse(
							404,
							"share_snapshot_not_found",
							"The share snapshot was not found.",
						);
					}

					return Response.json(
						{
							version: "1",
							status: result.status,
							revokedAt: result.revokedAt.toISOString(),
						},
						{ headers: ADMIN_RESPONSE_HEADERS },
					);
				} catch (error) {
					console.error(
						JSON.stringify({
							message: "Revoking a share snapshot failed.",
							snapshotId: params.snapshotId,
							error: error instanceof Error ? error.message : "Unknown error",
						}),
					);

					return adminErrorResponse(
						500,
						"share_snapshot_revocation_failed",
						"Revoking the share snapshot failed.",
					);
				}
			},
		},
	},
});
