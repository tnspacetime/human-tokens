import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import {
	EditorView as CodeMirrorView,
	keymap as codeMirrorKeymap,
	drawSelection,
	type KeyBinding,
	type ViewUpdate,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { exitCode } from "prosemirror-commands";
import { redo, undo } from "prosemirror-history";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { Selection, TextSelection } from "prosemirror-state";
import type { EditorView, NodeView } from "prosemirror-view";

type GetPosition = () => number | undefined;

const interviewHighlightStyle = HighlightStyle.define([
	{
		tag: [tags.keyword, tags.modifier, tags.self, tags.bool, tags.null],
		color: "var(--editor-syntax-keyword)",
	},
	{
		tag: [tags.string, tags.character, tags.attributeValue, tags.regexp],
		color: "var(--editor-syntax-string)",
	},
	{
		tag: [tags.number, tags.atom, tags.unit],
		color: "var(--editor-syntax-number)",
	},
	{
		tag: [
			tags.variableName,
			tags.propertyName,
			tags.attributeName,
			tags.labelName,
		],
		color: "var(--editor-syntax-name)",
	},
	{
		tag: [tags.typeName, tags.className, tags.namespace],
		color: "var(--editor-syntax-type)",
	},
	{
		tag: [tags.operator, tags.punctuation],
		color: "var(--editor-syntax-operator)",
	},
	{
		tag: tags.comment,
		color: "var(--sea-ink-soft)",
		fontStyle: "italic",
	},
	{
		tag: tags.invalid,
		color: "var(--editor-syntax-invalid)",
		textDecoration: "underline wavy",
	},
]);

function languageFor(params: unknown): Extension {
	const language =
		typeof params === "string" ? params.trim().toLowerCase() : "";

	switch (language) {
		case "ts":
		case "typescript":
			return javascript({ typescript: true });
		case "tsx":
			return javascript({ jsx: true, typescript: true });
		case "jsx":
			return javascript({ jsx: true });
		case "":
		case "js":
		case "javascript":
		case "mjs":
		case "cjs":
			return javascript();
		default:
			return [];
	}
}

class CodeBlockNodeView implements NodeView {
	readonly dom: HTMLElement;
	private readonly codeMirror: CodeMirrorView;
	private node: ProseMirrorNode;
	private updating = false;

	constructor(
		node: ProseMirrorNode,
		private readonly outerView: EditorView,
		private readonly getPosition: GetPosition,
	) {
		this.node = node;
		this.codeMirror = new CodeMirrorView({
			doc: node.textContent,
			extensions: [
				codeMirrorKeymap.of([
					...this.createKeymap(),
					...defaultKeymap,
					indentWithTab,
				]),
				drawSelection(),
				syntaxHighlighting(interviewHighlightStyle),
				languageFor(node.attrs.params),
				CodeMirrorView.lineWrapping,
				CodeMirrorView.updateListener.of((update) =>
					this.forwardUpdate(update),
				),
			],
		});
		this.dom = this.codeMirror.dom;
		this.dom.dataset.codeBlockEditor = "";
		this.codeMirror.contentDOM.setAttribute("aria-label", "Code block");
	}

	private createKeymap(): KeyBinding[] {
		return [
			{ key: "ArrowUp", run: () => this.maybeEscape("line", -1) },
			{ key: "ArrowLeft", run: () => this.maybeEscape("char", -1) },
			{ key: "ArrowDown", run: () => this.maybeEscape("line", 1) },
			{ key: "ArrowRight", run: () => this.maybeEscape("char", 1) },
			{
				key: "Ctrl-Enter",
				mac: "Cmd-Enter",
				run: () => {
					if (!exitCode(this.outerView.state, this.outerView.dispatch)) {
						return false;
					}

					this.outerView.focus();
					return true;
				},
			},
			{
				key: "Ctrl-z",
				mac: "Cmd-z",
				run: () => undo(this.outerView.state, this.outerView.dispatch),
			},
			{
				key: "Shift-Ctrl-z",
				mac: "Shift-Cmd-z",
				run: () => redo(this.outerView.state, this.outerView.dispatch),
			},
			{
				key: "Ctrl-y",
				mac: "Cmd-y",
				run: () => redo(this.outerView.state, this.outerView.dispatch),
			},
		];
	}

	private forwardUpdate(update: ViewUpdate) {
		if (this.updating || !this.codeMirror.hasFocus) {
			return;
		}

		const position = this.getPosition();

		if (position === undefined) {
			return;
		}

		let offset = position + 1;
		const { main } = update.state.selection;
		const selectionFrom = offset + main.from;
		const selectionTo = offset + main.to;
		const outerSelection = this.outerView.state.selection;

		if (
			!update.docChanged &&
			outerSelection.from === selectionFrom &&
			outerSelection.to === selectionTo
		) {
			return;
		}

		const transaction = this.outerView.state.tr;

		update.changes.iterChanges((fromA, toA, fromB, toB, text) => {
			if (text.length > 0) {
				transaction.replaceWith(
					offset + fromA,
					offset + toA,
					this.outerView.state.schema.text(text.toString()),
				);
			} else {
				transaction.delete(offset + fromA, offset + toA);
			}

			offset += toB - fromB - (toA - fromA);
		});

		transaction.setSelection(
			TextSelection.create(transaction.doc, selectionFrom, selectionTo),
		);
		this.outerView.dispatch(transaction);
	}

	private maybeEscape(unit: "line" | "char", direction: -1 | 1) {
		const { state } = this.codeMirror;
		const { main } = state.selection;

		if (!main.empty) {
			return false;
		}

		const line = unit === "line" ? state.doc.lineAt(main.head) : main;

		if (direction < 0 ? line.from > 0 : line.to < state.doc.length) {
			return false;
		}

		const position = this.getPosition();

		if (position === undefined) {
			return false;
		}

		const target = position + (direction < 0 ? 0 : this.node.nodeSize);
		const resolvedTarget = this.outerView.state.doc.resolve(target);
		const adjacentNode =
			direction < 0 ? resolvedTarget.nodeBefore : resolvedTarget.nodeAfter;

		if (!adjacentNode || adjacentNode.type.name === "question") {
			const paragraph = this.outerView.state.schema.nodes.paragraph;

			if (!paragraph) {
				return false;
			}

			const transaction = this.outerView.state.tr.insert(
				target,
				paragraph.create(),
			);
			transaction.setSelection(
				TextSelection.create(transaction.doc, target + 1),
			);
			this.outerView.dispatch(transaction.scrollIntoView());
			this.outerView.focus();
			return true;
		}

		const selection = Selection.near(resolvedTarget, direction);
		this.outerView.dispatch(
			this.outerView.state.tr.setSelection(selection).scrollIntoView(),
		);
		this.outerView.focus();
		return true;
	}

	setSelection(anchor: number, head: number) {
		this.codeMirror.focus();
		this.updating = true;
		this.codeMirror.dispatch({ selection: { anchor, head } });
		this.updating = false;
	}

	update(node: ProseMirrorNode) {
		if (
			node.type !== this.node.type ||
			node.attrs.params !== this.node.attrs.params
		) {
			return false;
		}

		this.node = node;
		const current = this.codeMirror.state.doc.toString();
		const next = node.textContent;

		if (current !== next) {
			let start = 0;
			let currentEnd = current.length;
			let nextEnd = next.length;

			while (
				start < currentEnd &&
				start < nextEnd &&
				current[start] === next[start]
			) {
				start++;
			}

			while (
				currentEnd > start &&
				nextEnd > start &&
				current[currentEnd - 1] === next[nextEnd - 1]
			) {
				currentEnd--;
				nextEnd--;
			}

			this.updating = true;
			this.codeMirror.dispatch({
				changes: {
					from: start,
					to: currentEnd,
					insert: next.slice(start, nextEnd),
				},
			});
			this.updating = false;
		}

		return true;
	}

	stopEvent() {
		return true;
	}

	ignoreMutation() {
		return true;
	}

	destroy() {
		this.codeMirror.destroy();
	}
}

export function createCodeBlockNodeView(
	node: ProseMirrorNode,
	view: EditorView,
	getPosition: GetPosition,
) {
	return new CodeBlockNodeView(node, view, getPosition);
}
