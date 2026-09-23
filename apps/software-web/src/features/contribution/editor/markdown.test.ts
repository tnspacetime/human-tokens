import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
	parseDraftInterviewMarkdown,
	parseInterviewMarkdown,
	parseInterviewMarkdownPaste,
	serializeInterviewMarkdown,
} from "./markdown";

test("plain text uses ProseMirror's default paste handling", () => {
	assert.equal(parseInterviewMarkdownPaste("Ordinary pasted text."), null);
});

test("the Markdown parser identifies inline formatting", () => {
	const paste = parseInterviewMarkdownPaste("Some **important** text.");
	let hasStrongText = false;

	paste?.document.descendants((node) => {
		if (node.marks.some((mark) => mark.type.name === "strong")) {
			hasStrongText = true;
		}
	});

	assert.equal(paste?.kind, "inline");
	assert.equal(hasStrongText, true);
});

test("the Markdown parser identifies block structure", () => {
	const paste = parseInterviewMarkdownPaste("- First\n- Second");

	assert.equal(paste?.kind, "block");
	assert.equal(paste?.document.firstChild?.type.name, "bullet_list");
});

test("escaped Markdown remains ordinary text", () => {
	assert.equal(parseInterviewMarkdownPaste("\\*not italic\\*"), null);
});

test("pasted questions without IDs receive unique internal IDs", () => {
	const paste = parseInterviewMarkdownPaste(`:::question
Why use **typed** \`Effect\`?
:::

**Effect:** Return a \`Promise<User>\`.

:::question
Second question?
:::

**Effect:** Second answer.`);
	const questions: Array<{ id: string; text: string }> = [];
	let hasStrongQuestion = false;
	let hasCodeQuestion = false;
	let hasStrongAnswer = false;
	let hasCodeAnswer = false;

	paste?.document.descendants((node, _position, parent) => {
		if (node.type.name === "question") {
			questions.push({ id: node.attrs.id, text: node.textContent });
		}

		for (const mark of node.marks) {
			if (parent?.type.name === "question") {
				hasStrongQuestion ||= mark.type.name === "strong";
				hasCodeQuestion ||= mark.type.name === "code";
			} else {
				hasStrongAnswer ||= mark.type.name === "strong";
				hasCodeAnswer ||= mark.type.name === "code";
			}
		}
	});

	assert.equal(paste?.kind, "block");
	assert.deepEqual(
		questions.map(({ text }) => text),
		["Why use typed Effect?", "Second question?"],
	);
	assert.match(questions[0]?.id ?? "", /^question-[0-9a-f-]{36}$/);
	assert.match(questions[1]?.id ?? "", /^question-[0-9a-f-]{36}$/);
	assert.notEqual(questions[0]?.id, questions[1]?.id);
	assert.equal(hasStrongQuestion, true);
	assert.equal(hasCodeQuestion, true);
	assert.equal(hasStrongAnswer, true);
	assert.equal(hasCodeAnswer, true);

	if (!paste) {
		assert.fail("Expected the Markdown paste to be parsed.");
	}

	const serialized = serializeInterviewMarkdown(paste.document);
	assert.match(serialized, /Why use \*\*typed\*\* `Effect`\?/);
	assert.match(serialized, /\*\*Effect:\*\* Return a `Promise<User>`\./);
	assert.equal(parseInterviewMarkdown(serialized).eq(paste.document), true);
});

test("draft loading recovers already-saved questions without IDs", () => {
	const document = parseDraftInterviewMarkdown(
		":::question\nPreviously saved question?\n:::",
	);
	const question = document.firstChild;

	assert.equal(question?.type.name, "question");
	assert.equal(question?.textContent, "Previously saved question?");
	assert.match(question?.attrs.id ?? "", /^question-[0-9a-f-]{36}$/);
});
