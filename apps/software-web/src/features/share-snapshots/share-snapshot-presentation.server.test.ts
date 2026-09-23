import { strict as assert } from "node:assert";
import { test } from "node:test";

import { compileShareSnapshotForPage } from "./share-snapshot-presentation.server";

test("an interview snapshot renders reserved questions for public reading", async () => {
	const snapshot = await compileShareSnapshotForPage({
		kind: "interview",
		shareId: "abcdefghijklmnopqrstuvwxyz123456",
		title: "A shared interview",
		summary: "A **frozen** summary.",
		contentMarkdown:
			':::question{id="question-one"}\nWhy build it?\n:::\n\nBecause it matters.',
		guestName: "Ada",
		guestDescription: "Developer",
		portraitUrl: null,
	});

	assert.equal(snapshot.kind, "interview");
	assert.match(snapshot.summaryHtml, /<strong>frozen<\/strong>/);
	assert.match(snapshot.contentHtml, /<h2>Why build it\?<\/h2>/);
	assert.equal(snapshot.guestName, "Ada");
});

test("a background-reading snapshot renders independently", async () => {
	const snapshot = await compileShareSnapshotForPage({
		kind: "background_reading",
		shareId: "abcdefghijklmnopqrstuvwxyz123456",
		title: "Background",
		summary: "Context.",
		contentMarkdown: "## Read further\n\nDetails.",
	});

	assert.equal(snapshot.kind, "background_reading");
	assert.match(snapshot.contentHtml, /<h2>Read further<\/h2>/);
	assert.equal("guestName" in snapshot, false);
});
