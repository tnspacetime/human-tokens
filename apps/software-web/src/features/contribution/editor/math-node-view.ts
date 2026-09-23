import katex from "katex";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { Selection, TextSelection } from "prosemirror-state";
import type { EditorView, NodeView } from "prosemirror-view";
import { getMathNodeSource } from "./schema";

type GetPosition = () => number | undefined;

class MathNodeView implements NodeView {
	readonly dom: HTMLElement;
	private readonly preview: HTMLElement;
	private readonly input: HTMLInputElement | HTMLTextAreaElement;
	private node: ProseMirrorNode;

	constructor(
		node: ProseMirrorNode,
		private readonly outerView: EditorView,
		private readonly getPosition: GetPosition,
		private readonly displayMode: boolean,
	) {
		this.node = node;
		this.dom = document.createElement(displayMode ? "div" : "span");
		this.preview = document.createElement(displayMode ? "div" : "span");
		this.input = document.createElement(displayMode ? "textarea" : "input");

		this.dom.dataset.mathNode = displayMode ? "block" : "inline";
		this.dom.contentEditable = "false";
		this.dom.title = "Click to edit formula";
		this.preview.dataset.mathPreview = "";
		this.input.dataset.mathInput = "";
		this.input.hidden = true;
		this.input.spellcheck = false;
		this.input.setAttribute("aria-label", "LaTeX formula");
		this.dom.appendChild(this.preview);
		this.dom.appendChild(this.input);
		this.dom.addEventListener("click", this.openEditor);
		this.input.addEventListener("blur", this.commit);
		this.input.addEventListener("keydown", this.handleKeyDown);

		const latex = getMathNodeSource(this.node);
		const startsEditing = this.displayMode && latex.length === 0;
		this.input.value = latex;
		this.input.hidden = !startsEditing;
		this.preview.hidden = startsEditing;

		if (startsEditing) {
			queueMicrotask(() => {
				if (this.dom.isConnected && !this.input.hidden) {
					this.input.focus();
				}
			});
		} else {
			this.render();
		}
	}

	private replaceWithParagraph() {
		const position = this.getPosition();
		const paragraph = this.outerView.state.schema.nodes.paragraph;

		if (position === undefined || !paragraph) {
			return false;
		}

		const transaction = this.outerView.state.tr.replaceWith(
			position,
			position + this.node.nodeSize,
			paragraph.create(),
		);
		transaction.setSelection(
			TextSelection.create(transaction.doc, position + 1),
		);
		this.outerView.dispatch(transaction.scrollIntoView());
		return true;
	}

	private moveOutsideBlock(direction: -1 | 1) {
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

	private readonly openEditor = (event: MouseEvent) => {
		if (!this.input.hidden) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		this.showEditor(true);
	};

	private showEditor(selectContents: boolean) {
		this.input.value = getMathNodeSource(this.node);
		this.preview.hidden = true;
		this.input.hidden = false;
		this.input.focus();

		if (selectContents) {
			this.input.select();
		} else {
			const end = this.input.value.length;
			this.input.setSelectionRange(end, end);
		}
	}

	private readonly commit = () => {
		if (this.input.hidden) {
			return;
		}

		const latex = this.input.value.trim();
		const currentLatex = getMathNodeSource(this.node);
		this.input.hidden = true;
		this.preview.hidden = false;

		if (latex.length === 0) {
			if (this.displayMode) {
				this.replaceWithParagraph();
				return;
			}

			this.render();
			return;
		}

		if (latex === currentLatex) {
			this.render();
			return;
		}

		const position = this.getPosition();

		if (position === undefined) {
			return;
		}

		this.outerView.dispatch(
			this.outerView.state.tr.setNodeMarkup(
				position,
				undefined,
				{ ...this.node.attrs, latex },
				this.node.marks,
			),
		);
	};

	private readonly handleKeyDown = (event: Event) => {
		if (!(event instanceof KeyboardEvent)) {
			return;
		}

		if (event.key === "Escape") {
			event.preventDefault();

			if (
				this.displayMode &&
				getMathNodeSource(this.node).length === 0 &&
				this.replaceWithParagraph()
			) {
				this.outerView.focus();
				return;
			}

			this.input.value = getMathNodeSource(this.node);
			this.input.hidden = true;
			this.preview.hidden = false;
			this.outerView.focus();
			return;
		}

		const hasCollapsedSelection =
			this.input.selectionStart === this.input.selectionEnd;
		const isAtFirstSourceLine = !this.input.value
			.slice(0, this.input.selectionStart ?? 0)
			.includes("\n");
		const isAtLastSourceLine = !this.input.value
			.slice(this.input.selectionEnd ?? 0)
			.includes("\n");
		const exitDirection =
			event.key === "ArrowUp" && isAtFirstSourceLine
				? -1
				: event.key === "ArrowDown" && isAtLastSourceLine
					? 1
					: null;

		if (this.displayMode && hasCollapsedSelection && exitDirection !== null) {
			event.preventDefault();
			const isEmpty = this.input.value.trim().length === 0;
			this.input.blur();

			if (!isEmpty) {
				this.moveOutsideBlock(exitDirection);
			} else {
				this.outerView.focus();
			}

			return;
		}

		const shouldCommit =
			(!this.displayMode && event.key === "Enter") ||
			(this.displayMode &&
				event.key === "Enter" &&
				(event.metaKey || event.ctrlKey));

		if (shouldCommit) {
			event.preventDefault();
			this.input.blur();
			this.outerView.focus();
		}
	};

	private render() {
		const latex = getMathNodeSource(this.node);
		this.dom.dataset.latex = latex;
		this.dom.setAttribute("aria-label", `Formula: ${latex}`);
		katex.render(latex, this.preview, {
			displayMode: this.displayMode,
			throwOnError: false,
			strict: "warn",
			trust: false,
		});
	}

	update(node: ProseMirrorNode) {
		if (node.type !== this.node.type) {
			return false;
		}

		this.node = node;

		if (this.input.hidden) {
			this.render();
		}

		return true;
	}

	stopEvent(event: Event) {
		return event.target instanceof Node && this.input.contains(event.target);
	}

	ignoreMutation() {
		return true;
	}

	selectNode() {
		if (!this.displayMode || !this.input.hidden) {
			return;
		}

		queueMicrotask(() => {
			if (this.dom.isConnected && this.input.hidden) {
				this.showEditor(false);
			}
		});
	}

	destroy() {
		this.dom.removeEventListener("click", this.openEditor);
		this.input.removeEventListener("blur", this.commit);
		this.input.removeEventListener("keydown", this.handleKeyDown);
	}
}

export function createInlineMathNodeView(
	node: ProseMirrorNode,
	view: EditorView,
	getPosition: GetPosition,
) {
	return new MathNodeView(node, view, getPosition, false);
}

export function createBlockMathNodeView(
	node: ProseMirrorNode,
	view: EditorView,
	getPosition: GetPosition,
) {
	return new MathNodeView(node, view, getPosition, true);
}
