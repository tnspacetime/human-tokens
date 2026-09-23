import { strict as assert } from "node:assert";
import { test } from "node:test";

import { compilePublicationForPage } from "./publication-presentation.server";

test("the web presentation renders interview Markdown as one document", async () => {
	const publication = await compilePublicationForPage({
		publicId: "public-interview-id-123",
		publicationDate: "2026-09-13",
		guest: {
			id: "00000000-0000-4000-8000-000000000000",
			name: "Human Tokens",
			description: "Publication",
		},
		interview: {
			title: "An interview",
			summary: "Summary.",
			contentMarkdown:
				"Opening paragraph.\n\n## Question\n\nAnswer.\n\n## Answer heading\n\nMore answer.\n\n```ts\nconst answer: number = 42;\n```",
			portraitUrl: null,
		},
		backgroundReading: {
			title: "Background",
			summary: "Background summary.",
			contentMarkdown: "Background content.",
		},
	});
	const { interview } = publication;

	assert.match(interview.contentHtml, /^<p>Opening paragraph\.<\/p>/);
	assert.equal(interview.contentHtml.match(/<h2>/g)?.length, 2);
	assert.match(interview.contentHtml, /<p>More answer\.<\/p>/);
	assert.match(interview.contentHtml, /data-rehype-pretty-code-figure/);
	assert.match(interview.contentHtml, /--shiki-light:/);
	assert.equal("questions" in interview, false);
	assert.equal("backgroundReading" in interview, false);
	assert.equal(publication.backgroundReading.title, "Background");
});
