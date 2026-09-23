import { baseKeymap, chainCommands, toggleMark } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { inputRules, undoInputRule } from "prosemirror-inputrules";
import { keymap } from "prosemirror-keymap";
import type { Fragment, Node as ProseMirrorNode } from "prosemirror-model";
import {
	liftListItem,
	sinkListItem,
	splitListItem,
} from "prosemirror-schema-list";
import {
	type Command,
	NodeSelection,
	Plugin,
	Selection,
	TextSelection,
} from "prosemirror-state";
import { findMissingGuestAnswerBlocks } from "./markdown";
import { createMarkdownInputRules } from "./markdown-input-rules";
import {
	getInterviewQuestionAttributes,
	interviewEditorSchema,
} from "./schema";
import type { InterviewEditorMode } from "./types";

const strong = interviewEditorSchema.marks.strong;
const emphasis = interviewEditorSchema.marks.em;
const code = interviewEditorSchema.marks.code;
const listItem = interviewEditorSchema.nodes.list_item;
const backspace = baseKeymap.Backspace;

if (!strong || !emphasis || !code || !listItem || !backspace) {
	throw new Error("The interview editor schema is missing required types.");
}

function getQuestionSignature(document: ProseMirrorNode) {
	const questions: Array<{ content: Fragment; id: string }> = [];

	document.descendants((node) => {
		if (node.type.name === "question") {
			questions.push({
				id: getInterviewQuestionAttributes(node).id,
				content: node.content,
			});
		}
	});

	return questions;
}

function questionsAreUnchanged(
	currentDocument: ProseMirrorNode,
	nextDocument: ProseMirrorNode,
) {
	const currentQuestions = getQuestionSignature(currentDocument);
	const nextQuestions = getQuestionSignature(nextDocument);

	return (
		currentQuestions.length === nextQuestions.length &&
		currentQuestions.every(
			(question, index) =>
				question.id === nextQuestions[index]?.id &&
				question.content.eq(nextQuestions[index]?.content),
		)
	);
}

function questionsAreValidDraft(document: ProseMirrorNode) {
	const questionIds = new Set<string>();
	let valid = true;

	try {
		document.descendants((node) => {
			if (node.type.name !== "question") {
				return;
			}

			const { id } = getInterviewQuestionAttributes(node);

			if (questionIds.has(id)) {
				valid = false;
				return false;
			}

			questionIds.add(id);
		});
	} catch {
		return false;
	}

	return valid;
}

function validateQuestionDrafts() {
	return new Plugin({
		filterTransaction(transaction) {
			return !transaction.docChanged || questionsAreValidDraft(transaction.doc);
		},
	});
}

function protectQuestions() {
	return new Plugin({
		filterTransaction(transaction, state) {
			return (
				!transaction.docChanged ||
				questionsAreUnchanged(state.doc, transaction.doc)
			);
		},
	});
}

function preserveGuestAnswerBlocks() {
	const paragraph = interviewEditorSchema.nodes.paragraph;

	if (!paragraph) {
		throw new Error(
			"The interview editor schema is missing its paragraph type.",
		);
	}

	return new Plugin({
		appendTransaction(transactions, _oldState, newState) {
			if (!transactions.some((transaction) => transaction.docChanged)) {
				return null;
			}

			const missingAnswers = findMissingGuestAnswerBlocks(newState.doc);

			if (missingAnswers.length === 0) {
				return null;
			}

			const strandedSelection =
				newState.selection.$from.parent.type.name === "question"
					? missingAnswers.reduce((nearestAnswer, answer) =>
							Math.abs(answer.position - newState.selection.from) <
							Math.abs(nearestAnswer.position - newState.selection.from)
								? answer
								: nearestAnswer,
						)
					: null;
			const transaction = newState.tr;

			for (const answer of [...missingAnswers].reverse()) {
				transaction.insert(answer.position, paragraph.create());
			}

			if (strandedSelection) {
				let questionPosition = 0;

				for (let index = 0; index < transaction.doc.childCount; index += 1) {
					const node = transaction.doc.child(index);

					if (
						node.type.name === "question" &&
						getInterviewQuestionAttributes(node).id ===
							strandedSelection.questionId
					) {
						transaction.setSelection(
							TextSelection.create(
								transaction.doc,
								questionPosition + node.nodeSize + 1,
							),
						);
						break;
					}

					questionPosition += node.nodeSize;
				}
			}

			return transaction;
		},
	});
}

const exitQuestion: Command = (state, dispatch) => {
	const { selection } = state;

	if (
		!(selection instanceof TextSelection) ||
		selection.$from.parent.type.name !== "question" ||
		selection.$from.parent !== selection.$to.parent
	) {
		return false;
	}

	const question = selection.$from.parent;
	const questionStart = selection.$from.before(selection.$from.depth);
	const { id } = getInterviewQuestionAttributes(question);
	const before = question.content.cut(0, selection.$from.parentOffset);
	const after = question.content.cut(
		selection.$to.parentOffset,
		question.content.size,
	);
	const firstQuestion = question.type.create({ id }, before);
	const answerParagraph = interviewEditorSchema.nodes.paragraph?.create(
		null,
		after,
	);

	if (!answerParagraph) {
		return false;
	}

	const transaction = state.tr.replaceWith(
		questionStart,
		questionStart + question.nodeSize,
		[firstQuestion, answerParagraph],
	);
	const answerStart = questionStart + firstQuestion.nodeSize;

	dispatch?.(
		transaction
			.setSelection(TextSelection.create(transaction.doc, answerStart + 1))
			.scrollIntoView(),
	);
	return true;
};

const deleteEmptyQuestion: Command = (state, dispatch) => {
	const { selection } = state;

	if (
		!(selection instanceof TextSelection) ||
		!selection.empty ||
		selection.$from.parent.type.name !== "question" ||
		selection.$from.parent.content.size !== 0
	) {
		return false;
	}

	const question = selection.$from.parent;
	const questionStart = selection.$from.before(selection.$from.depth);
	const paragraph = interviewEditorSchema.nodes.paragraph;

	if (!paragraph) {
		return false;
	}

	if (state.doc.childCount === 1) {
		const transaction = state.tr.replaceWith(
			questionStart,
			questionStart + question.nodeSize,
			paragraph.create(),
		);

		dispatch?.(
			transaction
				.setSelection(TextSelection.create(transaction.doc, questionStart + 1))
				.scrollIntoView(),
		);
		return true;
	}

	const transaction = state.tr.delete(
		questionStart,
		questionStart + question.nodeSize,
	);
	const selectionPosition = Math.min(
		questionStart,
		transaction.doc.content.size,
	);

	dispatch?.(
		transaction
			.setSelection(
				Selection.near(transaction.doc.resolve(selectionPosition), -1),
			)
			.scrollIntoView(),
	);
	return true;
};

function moveQuestion(direction: -1 | 1): Command {
	return (state, dispatch) => {
		const { selection } = state;

		if (
			!(selection instanceof TextSelection) ||
			selection.$from.parent.type.name !== "question" ||
			selection.$from.parent !== selection.$to.parent ||
			selection.$from.depth !== 1
		) {
			return false;
		}

		const question = selection.$from.parent;
		const questionStart = selection.$from.before(1);
		const questionIndex = selection.$from.index(0);
		const siblingIndex = questionIndex + direction;

		if (siblingIndex < 0 || siblingIndex >= state.doc.childCount) {
			return false;
		}

		const sibling = state.doc.child(siblingIndex);

		if (!sibling || sibling.type.name !== "question") {
			return false;
		}

		const anchorOffset = selection.anchor - questionStart - 1;
		const headOffset = selection.head - questionStart - 1;
		const rangeStart =
			direction === -1 ? questionStart - sibling.nodeSize : questionStart;
		const rangeEnd =
			direction === -1
				? questionStart + question.nodeSize
				: questionStart + question.nodeSize + sibling.nodeSize;
		const replacement =
			direction === -1 ? [question, sibling] : [sibling, question];
		const movedQuestionStart =
			direction === -1 ? rangeStart : questionStart + sibling.nodeSize;
		const transaction = state.tr.replaceWith(rangeStart, rangeEnd, replacement);

		dispatch?.(
			transaction
				.setSelection(
					TextSelection.create(
						transaction.doc,
						movedQuestionStart + 1 + anchorOffset,
						movedQuestionStart + 1 + headOffset,
					),
				)
				.scrollIntoView(),
		);
		return true;
	};
}

const enterMathBlockAbove: Command = (state, dispatch, view) => {
	const { selection } = state;

	if (
		!(selection instanceof TextSelection) ||
		!selection.empty ||
		!view?.endOfTextblock("up")
	) {
		return false;
	}

	const { $from } = selection;

	if ($from.depth === 0) {
		return false;
	}

	const currentBlockStart = $from.before($from.depth);
	const nodeBefore = state.doc.resolve(currentBlockStart).nodeBefore;

	if (!nodeBefore || nodeBefore.type.name !== "math_block") {
		return false;
	}

	dispatch?.(
		state.tr
			.setSelection(
				NodeSelection.create(
					state.doc,
					currentBlockStart - nodeBefore.nodeSize,
				),
			)
			.scrollIntoView(),
	);
	return true;
};

export function createInterviewEditorPlugins(
	mode: InterviewEditorMode,
): Plugin[] {
	return [
		validateQuestionDrafts(),
		...(mode === "draft" ? [] : [protectQuestions()]),
		...(mode === "guest" ? [preserveGuestAnswerBlocks()] : []),
		history(),
		inputRules({ rules: createMarkdownInputRules(mode) }),
		keymap({
			ArrowUp: enterMathBlockAbove,
			...(mode === "draft"
				? {
						"Alt-ArrowUp": moveQuestion(-1),
						"Alt-ArrowDown": moveQuestion(1),
					}
				: {}),
			"Mod-z": undo,
			"Shift-Mod-z": redo,
			"Mod-y": redo,
			"Mod-b": toggleMark(strong),
			"Mod-i": toggleMark(emphasis),
			"Mod-`": toggleMark(code),
			Backspace:
				mode === "draft"
					? chainCommands(deleteEmptyQuestion, undoInputRule, backspace)
					: chainCommands(undoInputRule, backspace),
			Enter:
				mode === "draft"
					? chainCommands(exitQuestion, splitListItem(listItem))
					: splitListItem(listItem),
			Tab: sinkListItem(listItem),
			"Shift-Tab": liftListItem(listItem),
		}),
		keymap(baseKeymap),
	];
}
