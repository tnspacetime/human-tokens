import { strict as assert } from "node:assert";
import { test } from "node:test";

import { normalizePublicPublication } from "./publication-contract";

test("the serialized public publication omits legacy metadata", async () => {
	const legacyPublication = {
		publicId: "public-interview-id-123",
		publicationDate: "2026-09-13",
		updatedAt: "2026-09-13T12:00:00.000Z",
		guest: {
			id: "00000000-0000-4000-8000-000000000000",
			name: "Human Tokens",
			description: "Publication",
		},
		interview: {
			title: "An interview",
			summary: "Summary.",
			contentMarkdown: "Interview content.",
			portraitUrl: null,
		},
		backgroundReading: {
			title: "Background",
			summary: "Background summary.",
			contentMarkdown: "Background content.",
		},
	};
	const response = Response.json({
		version: "1",
		item: normalizePublicPublication(legacyPublication),
	});
	const body = (await response.json()) as { item: Record<string, unknown> };

	assert.equal("updatedAt" in body.item, false);
	assert.deepEqual(Object.keys(body.item), [
		"publicId",
		"publicationDate",
		"guest",
		"interview",
		"backgroundReading",
	]);
});
