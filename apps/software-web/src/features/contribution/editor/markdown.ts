import {
	defaultMarkdownParser,
	defaultMarkdownSerializer,
	MarkdownParser,
	MarkdownSerializer,
} from "prosemirror-markdown";
import type { Fragment, Node as ProseMirrorNode } from "prosemirror-model";
import {
	type InterviewMarkdownBlock,
	parseInterviewMarkdownBlocks,
	parsePastedInterviewMarkdownBlocks,
} from "../../interviews/interview-markdown";
import { createMathMarkdownTokenizer } from "./math-markdown";
import {
	getInterviewQuestionAttributes,
	getMathNodeSource,
	interviewEditorSchema,
} from "./schema";

const commonMarkParser = new MarkdownParser(
	interviewEditorSchema,
	createMathMarkdownTokenizer(),
	{
		...defaultMarkdownParser.tokens,
		math_inline: {
			node: "math_inline",
			getAttrs: (token) => ({ latex: token.content }),
		},
		math_block: {
			node: "math_block",
			getAttrs: (token) => ({ latex: token.content }),
		},
	},
);

const interviewMarkdownSerializer = new MarkdownSerializer(
	{
		...defaultMarkdownSerializer.nodes,
		question(state, node) {
			const { id } = getInterviewQuestionAttributes(node);
			state.write(`:::question{id="${id}"}\n`);
			state.renderInline(node);
			state.write("\n:::");
			state.closeBlock(node);
		},
		math_inline(state, node) {
			state.write(`$${getMathNodeSource(node)}$`);
		},
		math_block(state, node) {
			state.write(`$$\n${getMathNodeSource(node)}\n$$`);
			state.closeBlock(node);
		},
	},
	defaultMarkdownSerializer.marks,
);

function createInterviewDocument(
	blocks: InterviewMarkdownBlock[],
): ProseMirrorNode {
	const nodes: ProseMirrorNode[] = [];
	const questionNodeType = interviewEditorSchema.nodes.question;
	const paragraphNodeType = interviewEditorSchema.nodes.paragraph;

	if (!questionNodeType || !paragraphNodeType) {
		throw new Error("The interview editor schema is incomplete.");
	}

	for (const block of blocks) {
		if (block.type === "question") {
			let content: Fragment | undefined;

			if (block.markdown.length > 0) {
				const questionDocument = commonMarkParser.parse(block.markdown);
				const paragraph = questionDocument.firstChild;

				if (
					questionDocument.childCount !== 1 ||
					paragraph?.type.name !== "paragraph"
				) {
					throw new RangeError(
						"Interview questions must contain one inline Markdown paragraph.",
					);
				}

				content = paragraph.content;
			}

			nodes.push(
				questionNodeType.create(
					{
						id: block.id,
					},
					content,
				),
			);
			continue;
		}

		if (block.markdown.trim().length === 0) {
			continue;
		}

		const document = commonMarkParser.parse(block.markdown);
		document.forEach((node) => {
			nodes.push(node);
		});
	}

	if (nodes.length === 0) {
		nodes.push(paragraphNodeType.create());
	}

	const document = interviewEditorSchema.topNodeType.createAndFill(null, nodes);

	if (!document) {
		throw new RangeError("The interview Markdown has an invalid structure.");
	}

	return document;
}

export function parseInterviewMarkdown(markdown: string): ProseMirrorNode {
	return createInterviewDocument(parseInterviewMarkdownBlocks(markdown));
}

export function parseDraftInterviewMarkdown(markdown: string): ProseMirrorNode {
	return createInterviewDocument(parsePastedInterviewMarkdownBlocks(markdown));
}

export type InterviewMarkdownPaste = {
	document: ProseMirrorNode;
	kind: "block" | "inline";
};

export function parseInterviewMarkdownPaste(
	markdown: string,
): InterviewMarkdownPaste | null {
	const document = parseDraftInterviewMarkdown(markdown);
	let hasBlockStructure = false;

	for (let index = 0; index < document.childCount; index += 1) {
		if (document.child(index).type.name !== "paragraph") {
			hasBlockStructure = true;
			break;
		}
	}

	if (hasBlockStructure) {
		return { document, kind: "block" };
	}

	let hasInlineFormatting = false;

	document.descendants((node) => {
		if (
			(node.isText && node.marks.length > 0) ||
			(node.isInline && !node.isText)
		) {
			hasInlineFormatting = true;
			return false;
		}
	});

	if (!hasInlineFormatting) {
		return null;
	}

	return {
		document,
		kind: document.childCount === 1 ? "inline" : "block",
	};
}

export type MissingGuestAnswerBlock = {
	position: number;
	questionId: string;
};

function containsEditableTextblock(node: ProseMirrorNode) {
	if (node.isTextblock && node.type.name !== "question") {
		return true;
	}

	let containsTextblock = false;

	node.descendants((descendant) => {
		if (descendant.isTextblock && descendant.type.name !== "question") {
			containsTextblock = true;
			return false;
		}
	});

	return containsTextblock;
}

export function findMissingGuestAnswerBlocks(
	document: ProseMirrorNode,
): MissingGuestAnswerBlock[] {
	const missingAnswers: MissingGuestAnswerBlock[] = [];
	let position = 0;

	for (let index = 0; index < document.childCount; index += 1) {
		const node = document.child(index);
		position += node.nodeSize;

		if (node.type.name !== "question") {
			continue;
		}

		let hasEditableAnswer = false;

		for (
			let answerIndex = index + 1;
			answerIndex < document.childCount;
			answerIndex += 1
		) {
			const answerNode = document.child(answerIndex);

			if (answerNode.type.name === "question") {
				break;
			}

			if (containsEditableTextblock(answerNode)) {
				hasEditableAnswer = true;
				break;
			}
		}

		if (!hasEditableAnswer) {
			missingAnswers.push({
				position,
				questionId: getInterviewQuestionAttributes(node).id,
			});
		}
	}

	return missingAnswers;
}

export function addMissingGuestAnswerParagraphs(
	document: ProseMirrorNode,
): ProseMirrorNode {
	const paragraphNodeType = interviewEditorSchema.nodes.paragraph;

	if (!paragraphNodeType) {
		throw new Error("The interview editor schema is incomplete.");
	}

	const missingQuestionIds = new Set(
		findMissingGuestAnswerBlocks(document).map(({ questionId }) => questionId),
	);

	if (missingQuestionIds.size === 0) {
		return document;
	}

	const nodes: ProseMirrorNode[] = [];

	for (let index = 0; index < document.childCount; index += 1) {
		const node = document.child(index);
		nodes.push(node);

		if (
			node.type.name === "question" &&
			missingQuestionIds.has(getInterviewQuestionAttributes(node).id)
		) {
			nodes.push(paragraphNodeType.create());
		}
	}

	return document.type.create(document.attrs, nodes, document.marks);
}

export function serializeInterviewMarkdown(document: ProseMirrorNode): string {
	return interviewMarkdownSerializer.serialize(document);
}
