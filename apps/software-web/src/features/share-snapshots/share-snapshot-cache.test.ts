import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
	getShareSnapshotCacheTag,
	getShareSnapshotHeaders,
	SHARE_SNAPSHOT_NOT_FOUND_HEADERS,
} from "./share-snapshot-cache";

test("share snapshots use an isolated long-lived cache tag", () => {
	const shareId = "abcdefghijklmnopqrstuvwxyz123456";
	const headers = getShareSnapshotHeaders(shareId);

	assert.equal(headers["Cache-Tag"], getShareSnapshotCacheTag(shareId));
	assert.equal(headers["Cache-Control"], "public, max-age=0");
	assert.match(headers["Cloudflare-CDN-Cache-Control"], /max-age=31536000/);
	assert.equal(headers["X-Robots-Tag"], "noindex, nofollow");
});

test("unavailable share snapshots are never cached", () => {
	assert.equal(SHARE_SNAPSHOT_NOT_FOUND_HEADERS["Cache-Control"], "no-store");
	assert.equal(
		SHARE_SNAPSHOT_NOT_FOUND_HEADERS["Cloudflare-CDN-Cache-Control"],
		"no-store",
	);
});
