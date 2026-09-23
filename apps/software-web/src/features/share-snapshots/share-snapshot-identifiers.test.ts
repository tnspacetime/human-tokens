import { strict as assert } from "node:assert";
import { test } from "node:test";

import { isValidShareId } from "./share-snapshot-identifiers";

test("share IDs must be long URL-safe opaque values", () => {
	assert.equal(isValidShareId("abcdefghijklmnopqrstuvwxyz123456"), true);
	assert.equal(isValidShareId("short"), false);
	assert.equal(isValidShareId("abcdefghijklmnopqrstuvwxyz/123456"), false);
});
