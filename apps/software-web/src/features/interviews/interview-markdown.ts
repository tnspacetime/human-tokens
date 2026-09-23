import type { Nodes, Paragraph, Root, RootContent } from "mdast";
import type { ContainerDirective } from "mdast-util-directive";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import type { Plugin } from "unified";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";
import {
	remarkStandaloneDoubleDollarMath,
	stringifyOneLineMath,
} from "../../lib/remark-math";

export type InterviewQuestionAttributes = {
	id: string;
	text: string;
};

export type InterviewMarkdownBlock =
	| { type: "content"; markdown: string }
	| ({ type: "question"; markdown: string } & InterviewQuestionAttributes);

const QUESTION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

function createInterviewMarkdownProcessor() {
	return unified()
		.use(remarkParse)
		.use(remarkDirective)
		.use(remarkGfm)
		.use(remarkMath)
		.use(remarkStandaloneDoubleDollarMath);
}

const interviewMarkdownDocument = createInterviewMarkdownProcessor().use(
	remarkStringify,
	{
		handlers: {
			math: stringifyOneLineMath,
		},
	},
);

export function assertInterviewQuestionId(
	value: unknown,
): asserts value is string {
	if (typeof value !== "string" || !QUESTION_ID_PATTERN.test(value)) {
		throw new RangeError("Interview question IDs must be URL-safe strings.");
	}
}

export function assertInterviewQuestionText(
	value: unknown,
): asserts value is string {
	assertInterviewQuestionDraftText(value);

	if (value.length === 0 || value !== value.trim()) {
		throw new RangeError(
			"Interview questions must be non-empty, single-line strings.",
		);
	}
}

export function assertInterviewQuestionDraftText(
	value: unknown,
): asserts value is string {
	if (
		typeof value !== "string" ||
		value.length > 1_000 ||
		/[\r\n]/.test(value)
	) {
		throw new RangeError(
			"Draft interview questions must be single-line strings of at most 1,000 characters.",
		);
	}
}

export function serializeInterviewQuestionBlock({
	id,
	text,
}: InterviewQuestionAttributes): string {
	assertInterviewQuestionId(id);
	assertInterviewQuestionText(text);

	return `:::question{id="${id}"}\n${text}\n:::`;
}

export function serializeInterviewQuestionDraftBlock({
	id,
	text,
}: InterviewQuestionAttributes): string {
	assertInterviewQuestionId(id);
	assertInterviewQuestionDraftText(text);

	return `:::question{id="${id}"}\n${text}\n:::`;
}

function getNodeText(node: Nodes): string {
	if ("value" in node && typeof node.value === "string") {
		return node.value;
	}

	if ("children" in node) {
		return node.children.map(getNodeText).join("");
	}

	return "";
}

function readQuestionDirective(
	node: ContainerDirective,
	allowEmpty: boolean,
): InterviewQuestionAttributes & { markdown: string; paragraph: Paragraph } {
	if (node.name !== "question") {
		throw new RangeError(`Unsupported interview directive: ${node.name}.`);
	}

	const attributes = node.attributes ?? {};
	const attributeNames = Object.keys(attributes);

	if (attributeNames.some((name) => name !== "id")) {
		throw new RangeError("Interview question directives only support an ID.");
	}

	const id = attributes.id;
	assertInterviewQuestionId(id);

	if (node.children.length !== 1 || node.children[0]?.type !== "paragraph") {
		throw new RangeError(
			"Interview question directives must contain exactly one paragraph.",
		);
	}

	const paragraph = node.children[0];
	const text = getNodeText(paragraph);

	if (allowEmpty) {
		assertInterviewQuestionDraftText(text);
	} else {
		assertInterviewQuestionText(text);
	}

	return {
		id,
		text,
		markdown: stringifyNodes([paragraph]),
		paragraph,
	};
}

function assertInterviewDirectives(tree: Root, allowEmpty: boolean) {
	visit(tree, (node, index, parent) => {
		if (
			node.type !== "containerDirective" &&
			node.type !== "leafDirective" &&
			node.type !== "textDirective"
		) {
			return;
		}

		if (
			node.type !== "containerDirective" ||
			node.name !== "question" ||
			parent?.type !== "root" ||
			index === undefined
		) {
			throw new RangeError(
				"Only top-level question directives are supported in interviews.",
			);
		}

		readQuestionDirective(node, allowEmpty);
		return SKIP;
	});
}

const remarkQuestionDirectivesToHeadings: Plugin<[], Root> = () => {
	return (tree) => {
		assertInterviewDirectives(tree, false);

		visit(tree, "containerDirective", (node, index, parent) => {
			if (
				node.name !== "question" ||
				index === undefined ||
				parent?.type !== "root"
			) {
				return;
			}

			const { paragraph } = readQuestionDirective(node, false);
			parent.children[index] = {
				type: "heading",
				depth: 2,
				children: paragraph.children,
			};

			return SKIP;
		});
	};
};

const publicInterviewMarkdownDocument = createInterviewMarkdownProcessor()
	.use(remarkQuestionDirectivesToHeadings)
	.use(remarkStringify, {
		handlers: {
			math: stringifyOneLineMath,
		},
	});

function stringifyNodes(nodes: RootContent[]) {
	return interviewMarkdownDocument
		.stringify({ type: "root", children: nodes } satisfies Root)
		.trim();
}

function parseInterviewMarkdownTree(markdown: string): Root {
	return interviewMarkdownDocument.runSync(
		interviewMarkdownDocument.parse(markdown),
		{ value: markdown },
	);
}

type QuestionIdInsertion = {
	id: string;
	offset: number;
	opening: string;
};

function addMissingPastedQuestionIds(tree: Root): QuestionIdInsertion[] {
	const insertions: QuestionIdInsertion[] = [];

	visit(tree, "containerDirective", (node) => {
		if (node.name !== "question") {
			return;
		}

		const attributes = node.attributes ?? {};

		if (Object.hasOwn(attributes, "id")) {
			return;
		}

		const id = `question-${globalThis.crypto.randomUUID()}`;
		const offset = node.position?.start.offset;
		const opening = `:::${node.name}`;

		if (offset === undefined) {
			throw new RangeError("The pasted question position is unavailable.");
		}

		node.attributes = {
			...attributes,
			id,
		};
		insertions.push({ id, offset, opening });
	});

	return insertions;
}

function readInterviewMarkdownBlocks(tree: Root): InterviewMarkdownBlock[] {
	assertInterviewDirectives(tree, true);

	const blocks: InterviewMarkdownBlock[] = [];
	let content: RootContent[] = [];

	const flushContent = () => {
		if (content.length > 0) {
			blocks.push({
				type: "content",
				markdown: stringifyNodes(content),
			});
			content = [];
		}
	};

	for (const node of tree.children) {
		if (node.type !== "containerDirective") {
			content.push(node);
			continue;
		}

		flushContent();
		const { id, markdown, text } = readQuestionDirective(node, true);
		blocks.push({ type: "question", id, markdown, text });
	}

	flushContent();

	return blocks;
}

export function parseInterviewMarkdownBlocks(
	markdown: string,
): InterviewMarkdownBlock[] {
	return readInterviewMarkdownBlocks(parseInterviewMarkdownTree(markdown));
}

export function parsePastedInterviewMarkdownBlocks(
	markdown: string,
): InterviewMarkdownBlock[] {
	const tree = parseInterviewMarkdownTree(markdown);
	addMissingPastedQuestionIds(tree);
	return readInterviewMarkdownBlocks(tree);
}

export function addMissingInterviewQuestionIds(markdown: string): {
	markdown: string;
	addedQuestionIds: string[];
} {
	const tree = parseInterviewMarkdownTree(markdown);
	const insertions = addMissingPastedQuestionIds(tree);
	readInterviewMarkdownBlocks(tree);

	let normalizedMarkdown = markdown;

	for (const insertion of [...insertions].sort(
		(left, right) => right.offset - left.offset,
	)) {
		if (
			markdown.slice(
				insertion.offset,
				insertion.offset + insertion.opening.length,
			) !== insertion.opening
		) {
			throw new RangeError(
				"The pasted question source could not be normalized.",
			);
		}

		const attributeOffset = insertion.offset + insertion.opening.length;
		normalizedMarkdown = `${normalizedMarkdown.slice(0, attributeOffset)}{id="${insertion.id}"}${normalizedMarkdown.slice(attributeOffset)}`;
	}

	return {
		markdown: normalizedMarkdown,
		addedQuestionIds: insertions.map(({ id }) => id),
	};
}

export function assertInterviewMarkdownPublishable(markdown: string) {
	const questionIds = new Set<string>();
	let questionCount = 0;

	for (const block of parseInterviewMarkdownBlocks(markdown)) {
		if (block.type !== "question") {
			continue;
		}

		assertInterviewQuestionText(block.text);

		if (questionIds.has(block.id)) {
			throw new RangeError("Interview question IDs must be unique.");
		}

		questionIds.add(block.id);
		questionCount += 1;
	}

	if (questionCount === 0) {
		throw new RangeError(
			"Published interviews must contain at least one question.",
		);
	}
}

export function toPublicInterviewMarkdown(markdown: string): string {
	return String(publicInterviewMarkdownDocument.processSync(markdown)).trim();
}
