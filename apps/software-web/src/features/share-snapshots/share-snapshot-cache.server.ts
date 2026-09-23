import { cache } from "cloudflare:workers";
import { getShareSnapshotCacheTag } from "./share-snapshot-cache";

export async function purgeShareSnapshotCache(shareId: string) {
	const result = await cache.purge({
		tags: [getShareSnapshotCacheTag(shareId)],
	});

	if (!result.success) {
		throw new Error(
			`Purging the share snapshot cache failed: ${result.errors
				.map((error) => `${error.code}: ${error.message}`)
				.join(", ")}`,
		);
	}
}
