import { strict as assert } from "node:assert";
import { test } from "node:test";

import { getPublicationPublishCachePurge } from "./publication-cache";

test("a publishing retry repeats every required cache purge", () => {
	const guestId = "guest-id";
	const firstAttempt = getPublicationPublishCachePurge(guestId);
	const retry = getPublicationPublishCachePurge(guestId);

	assert.deepEqual(firstAttempt, {
		homepage: true,
		guestIds: [guestId],
		guestList: true,
	});
	assert.deepEqual(retry, firstAttempt);
});
