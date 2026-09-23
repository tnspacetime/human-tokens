import { schema as markdownSchema } from "prosemirror-markdown";
import {
	type NodeSpec,
	type Node as ProseMirrorNode,
	Schema,
} from "prosemirror-model";
import {
	assertInterviewQuestionDraftText,
	assertInterviewQuestionId,
	type InterviewQuestionAttributes,
} from "../../interviews/interview-markdown";

function assertMathSource(
	value: unknown,
	allowEmpty: boolean,
): asserts value is string {
	if (
		typeof value !== "string" ||
		(!allowEmpty && value.length === 0) ||
		value.length > 10_000 ||
		value !== value.trim()
	) {
		throw new RangeError("Math source must be a non-empty trimmed string.");
	}
}

function getMathSource(node: ProseMirrorNode) {
	const source = node.attrs.latex;
	assertMathSource(source, node.type.name === "math_block");
	return source;
}

function getMathAttrs(dom: HTMLElement | string, allowEmpty: boolean) {
	if (typeof dom === "string") {
		return false;
	}

	const latex = dom.getAttribute("data-latex");

	try {
		assertMathSource(latex, allowEmpty);
	} catch {
		return false;
	}

	return { latex };
}

const mathInlineNodeSpec: NodeSpec = {
	inline: true,
	group: "inline",
	atom: true,
	selectable: true,
	attrs: {
		latex: { validate: (value) => assertMathSource(value, false) },
	},
	parseDOM: [
		{
			tag: "span[data-math-inline]",
			getAttrs: (dom) => getMathAttrs(dom, false),
		},
	],
	toDOM(node) {
		const latex = getMathSource(node);
		return [
			"span",
			{ "data-math-inline": "", "data-latex": latex },
			`$${latex}$`,
		];
	},
};

const mathBlockNodeSpec: NodeSpec = {
	group: "block",
	atom: true,
	isolating: true,
	selectable: true,
	attrs: {
		latex: { validate: (value) => assertMathSource(value, true) },
	},
	parseDOM: [
		{
			tag: "div[data-math-block]",
			getAttrs: (dom) => getMathAttrs(dom, true),
		},
	],
	toDOM(node) {
		const latex = getMathSource(node);
		return [
			"div",
			{ "data-math-block": "", "data-latex": latex },
			`$$\n${latex}\n$$`,
		];
	},
};

const questionNodeSpec: NodeSpec = {
	group: "block",
	content: "inline*",
	isolating: true,
	selectable: false,
	defining: true,
	attrs: {
		id: { validate: assertInterviewQuestionId },
	},
	parseDOM: [
		{
			tag: "h1[data-interview-question]",
			getAttrs(dom) {
				if (typeof dom === "string") {
					return false;
				}

				const id = dom.getAttribute("data-interview-question");

				try {
					assertInterviewQuestionId(id);
				} catch {
					return false;
				}

				return { id };
			},
		},
		{
			tag: "h2[data-interview-question]",
			getAttrs(dom) {
				if (typeof dom === "string") {
					return false;
				}

				const id = dom.getAttribute("data-interview-question");

				try {
					assertInterviewQuestionId(id);
				} catch {
					return false;
				}

				return { id };
			},
		},
	],
	toDOM(node) {
		const { id } = getInterviewQuestionAttributes(node);
		return ["h1", { "data-interview-question": id }, 0];
	},
};

const interviewNodes = markdownSchema.spec.nodes
	.addBefore("image", "math_inline", mathInlineNodeSpec)
	.addBefore("horizontal_rule", "math_block", mathBlockNodeSpec)
	.addBefore("heading", "question", questionNodeSpec);

export const interviewEditorSchema = new Schema({
	nodes: interviewNodes,
	marks: markdownSchema.spec.marks,
});

export function getInterviewQuestionAttributes(
	node: ProseMirrorNode,
): InterviewQuestionAttributes {
	if (node.type.name !== "question") {
		throw new RangeError("Expected an interview question node.");
	}

	const { id } = node.attrs;
	const text = node.textContent;
	assertInterviewQuestionId(id);
	assertInterviewQuestionDraftText(text);

	return { id, text };
}

export function getMathNodeSource(node: ProseMirrorNode) {
	if (node.type.name !== "math_inline" && node.type.name !== "math_block") {
		throw new RangeError("Expected a math node.");
	}

	return getMathSource(node);
}
