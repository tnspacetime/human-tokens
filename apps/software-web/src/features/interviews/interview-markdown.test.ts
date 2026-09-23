import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
	addMissingInterviewQuestionIds,
	assertInterviewMarkdownPublishable,
	parseInterviewMarkdownBlocks,
	toPublicInterviewMarkdown,
} from "./interview-markdown";

test("adding missing question IDs preserves the rest of the source exactly", () => {
	const source = `Opening text.

:::question
Why?
:::

**Effect:** Because.
`;
	const normalized = addMissingInterviewQuestionIds(source);
	const questionId = normalized.addedQuestionIds[0];

	assert.equal(normalized.addedQuestionIds.length, 1);
	assert.equal(
		normalized.markdown,
		source.replace(":::question", `:::question{id="${questionId}"}`),
	);
	assert.doesNotThrow(() => parseInterviewMarkdownBlocks(normalized.markdown));
});

test("stored interview Markdown still requires question IDs", () => {
	assert.throws(
		() => parseInterviewMarkdownBlocks(":::question\nQuestion?\n:::"),
		/question IDs must be URL-safe strings/,
	);
});

test("question blocks preserve inline Markdown separately from plain text", () => {
	const [question] = parseInterviewMarkdownBlocks(`:::question{id="q1"}
Why use **typed** \`Effect\`?
:::`);

	assert.deepEqual(question, {
		type: "question",
		id: "q1",
		text: "Why use typed Effect?",
		markdown: "Why use **typed** `Effect`?",
	});
});

test("publishable interviews allow unanswered questions", () => {
	assert.doesNotThrow(() =>
		assertInterviewMarkdownPublishable(`:::question{id="q1"}
First question?
:::

:::question{id="q2"}
Optional question?
:::`),
	);
});

test("publishable interviews require a question", () => {
	assert.throws(
		() => assertInterviewMarkdownPublishable("An ordinary paragraph."),
		/at least one question/,
	);
});

test("publishable interviews require non-empty unique questions", () => {
	assert.throws(
		() =>
			assertInterviewMarkdownPublishable(`:::question{id="q1"}
First question?
:::

:::question{id="q1"}
Second question?
:::`),
		/unique/,
	);

	assert.throws(() =>
		assertInterviewMarkdownPublishable(`:::question{id="q1"}

:::`),
	);
});

test("public conversion preserves the complete document and converts questions", () => {
	const converted = toPublicInterviewMarkdown(`Opening paragraph.

:::question{id="q1"}
What does **reliable** \`Effect\` mean?
:::

Answer paragraph.

## A heading inside the answer

More answer.`);

	assert.match(converted, /^Opening paragraph\./);
	assert.match(converted, /## What does \*\*reliable\*\* `Effect` mean\?/);
	assert.match(converted, /Answer paragraph\./);
	assert.match(converted, /## A heading inside the answer/);
	assert.match(converted, /More answer\.$/);
});
