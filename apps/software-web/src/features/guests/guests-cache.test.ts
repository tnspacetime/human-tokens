import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
	GUEST_LIST_CACHE_TAG,
	getGuestCacheTag,
	getPublicGuestResponseHeaders,
	PUBLIC_GUESTS_RESPONSE_HEADERS,
} from "./guests-cache";

function parseCacheTags(value: string) {
	return value.split(",");
}

test("guest list and detail responses use separate cache tags", () => {
	const guestId = "guest-id";
	const listTags = parseCacheTags(PUBLIC_GUESTS_RESPONSE_HEADERS["Cache-Tag"]);
	const detailTags = parseCacheTags(
		getPublicGuestResponseHeaders(guestId)["Cache-Tag"],
	);

	assert.ok(listTags.includes(GUEST_LIST_CACHE_TAG));
	assert.ok(!listTags.includes(getGuestCacheTag(guestId)));
	assert.ok(detailTags.includes(getGuestCacheTag(guestId)));
	assert.ok(!detailTags.includes(GUEST_LIST_CACHE_TAG));
});
