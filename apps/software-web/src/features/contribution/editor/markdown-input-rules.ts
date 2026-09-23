import {
	ellipsis,
	InputRule,
	smartQuotes,
	textblockTypeInputRule,
	wrappingInputRule,
} from "prosemirror-inputrules";
import type { MarkType } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import { interviewEditorSchema } from "./schema";
import type { InterviewEditorMode } from "./types";

function markInputRule(pattern: RegExp, markType: MarkType) {
	return new InputRule(
		pattern,
		(state, match, start, end) => {
			const prefix = match[1] ?? "";
			const text = match[2];

			if (!text) {
				return null;
			}

			const markStart = start + prefix.length;
			const markEnd = markStart + text.length;

			return state.tr
				.delete(markStart, end)
				.insertText(text, markStart)
				.addMark(markStart, markEnd, markType.create())
				.removeStoredMark(markType);
		},
		{ inCodeMark: false },
	);
}

const strong = interviewEditorSchema.marks.strong;
const emphasis = interviewEditorSchema.marks.em;
const code = interviewEditorSchema.marks.code;
const heading = interviewEditorSchema.nodes.heading;
const blockquote = interviewEditorSchema.nodes.blockquote;
const bulletList = interviewEditorSchema.nodes.bullet_list;
const orderedList = interviewEditorSchema.nodes.ordered_list;
const codeBlock = interviewEditorSchema.nodes.code_block;
const paragraph = interviewEditorSchema.nodes.paragraph;
const mathInline = interviewEditorSchema.nodes.math_inline;
const mathBlock = interviewEditorSchema.nodes.math_block;
const question = interviewEditorSchema.nodes.question;
const horizontalRule = interviewEditorSchema.nodes.horizontal_rule;

if (
	!strong ||
	!emphasis ||
	!code ||
	!heading ||
	!blockquote ||
	!bulletList ||
	!orderedList ||
	!codeBlock ||
	!paragraph ||
	!mathInline ||
	!mathBlock ||
	!question ||
	!horizontalRule
) {
	throw new Error("The interview editor schema cannot support Markdown input.");
}

function horizontalRuleInputRule() {
	return new InputRule(/^(?:---|\*\*\*|___)$/, (state, _match, start) => {
		const resolvedStart = state.doc.resolve(start);
		const from = resolvedStart.before();
		const to = resolvedStart.after();
		const rule = horizontalRule.create();
		const transaction = state.tr.replaceWith(from, to, [
			rule,
			paragraph.create(),
		]);

		return transaction.setSelection(
			TextSelection.create(transaction.doc, from + rule.nodeSize + 1),
		);
	});
}

function questionInputRule() {
	return new InputRule(/^:::question\s$/, (state, _match, start) => {
		const resolvedStart = state.doc.resolve(start);
		const from = resolvedStart.before();
		const to = resolvedStart.after();
		const questionNode = question.create({
			id: `question-${globalThis.crypto.randomUUID()}`,
		});
		const transaction = state.tr.replaceWith(from, to, questionNode);

		return transaction.setSelection(
			TextSelection.create(transaction.doc, from + 1),
		);
	});
}

function inlineMathInputRule() {
	return new InputRule(
		/(^|[^\\$])\$([^$\n]+)\$$/,
		(state, match, start, end) => {
			const prefix = match[1] ?? "";
			const latex = match[2]?.trim();

			if (!latex) {
				return null;
			}

			return state.tr.replaceWith(
				start + prefix.length,
				end,
				mathInline.create({ latex }),
			);
		},
		{ inCodeMark: false },
	);
}

function blockMathInputRule() {
	return new InputRule(/^\$\$$/, (state, _match, start) => {
		const resolvedStart = state.doc.resolve(start);
		const from = resolvedStart.before();
		const to = resolvedStart.after();
		const formula = mathBlock.create({ latex: "" });
		const transaction = state.tr.replaceWith(from, to, [
			formula,
			paragraph.create(),
		]);

		return transaction.setSelection(
			TextSelection.create(transaction.doc, from + formula.nodeSize + 1),
		);
	});
}

export function createMarkdownInputRules(
	mode: InterviewEditorMode,
): InputRule[] {
	return [
		...(mode === "draft" ? [questionInputRule()] : []),
		blockMathInputRule(),
		horizontalRuleInputRule(),
		inlineMathInputRule(),
		markInputRule(/(^|[^\\*])\*\*([^*\s](?:[^*\n]*[^*\s])?)\*\*$/, strong),
		markInputRule(/(^|[^\\*])\*([^*\s](?:[^*\n]*[^*\s])?)\*$/, emphasis),
		markInputRule(/(^|[^\\`])`([^`\n]+)`$/, code),
		textblockTypeInputRule(/^(#{1,6})\s$/, heading, (match) => ({
			level: match[1]?.length ?? 1,
		})),
		textblockTypeInputRule(/^```$/, codeBlock),
		wrappingInputRule(/^\s*>\s$/, blockquote),
		wrappingInputRule(/^\s*([-+*])\s$/, bulletList),
		wrappingInputRule(
			/^(\d+)\.\s$/,
			orderedList,
			(match) => ({ order: Number(match[1]) }),
			(match, node) =>
				node.childCount + Number(node.attrs.order) === Number(match[1]),
		),
		...smartQuotes,
		ellipsis,
	];
}
