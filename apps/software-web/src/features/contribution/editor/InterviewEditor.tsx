import { Slice } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import "prosemirror-view/style/prosemirror.css";
import { type Ref, useEffect, useImperativeHandle, useRef } from "react";
import { createCodeBlockNodeView } from "./code-block-node-view";
import styles from "./InterviewEditor.module.css";
import {
	addMissingGuestAnswerParagraphs,
	type InterviewMarkdownPaste,
	parseDraftInterviewMarkdown,
	parseInterviewMarkdown,
	parseInterviewMarkdownPaste,
	serializeInterviewMarkdown,
} from "./markdown";
import {
	createBlockMathNodeView,
	createInlineMathNodeView,
} from "./math-node-view";
import { createInterviewEditorPlugins } from "./plugins";
import { createLockedQuestionNodeView } from "./question-node-view";
import type { InterviewEditorMode } from "./types";

export type { InterviewEditorMode } from "./types";

export type InterviewEditorHandle = {
	getMarkdown: () => string;
};

type InterviewEditorProps = {
	initialMarkdown: string;
	mode: InterviewEditorMode;
	onDocumentChange?: () => void;
	ref?: Ref<InterviewEditorHandle>;
};

export default function InterviewEditor({
	initialMarkdown,
	mode,
	onDocumentChange,
	ref,
}: InterviewEditorProps) {
	const hostRef = useRef<HTMLDivElement>(null);
	const viewRef = useRef<EditorView | null>(null);
	const onDocumentChangeRef = useRef(onDocumentChange);

	useEffect(() => {
		onDocumentChangeRef.current = onDocumentChange;
	}, [onDocumentChange]);

	useImperativeHandle(
		ref,
		() => ({
			getMarkdown: () =>
				viewRef.current
					? serializeInterviewMarkdown(viewRef.current.state.doc)
					: initialMarkdown,
		}),
		[initialMarkdown],
	);

	useEffect(() => {
		const host = hostRef.current;

		if (!host) {
			return;
		}

		const parsedDocument =
			mode === "draft"
				? parseDraftInterviewMarkdown(initialMarkdown)
				: parseInterviewMarkdown(initialMarkdown);
		const initialDocument =
			mode === "guest"
				? addMissingGuestAnswerParagraphs(parsedDocument)
				: parsedDocument;
		const state = EditorState.create({
			doc: initialDocument,
			plugins: createInterviewEditorPlugins(mode),
		});

		const editorView = new EditorView(host, {
			state,
			handlePaste(view, event) {
				const markdown = event.clipboardData?.getData("text/plain") ?? "";
				let parsedPaste: InterviewMarkdownPaste | null;

				try {
					parsedPaste = parseInterviewMarkdownPaste(markdown);
				} catch {
					return false;
				}

				if (!parsedPaste) {
					return false;
				}

				const { document: pastedDocument, kind: pasteKind } = parsedPaste;

				if (mode !== "draft") {
					let containsQuestion = false;

					pastedDocument.descendants((node) => {
						if (node.type.name === "question") {
							containsQuestion = true;
							return false;
						}
					});

					if (containsQuestion) {
						return false;
					}
				}

				const slice =
					pasteKind === "block"
						? new Slice(pastedDocument.content, 0, 0)
						: Slice.maxOpen(pastedDocument.content);

				view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
				return true;
			},
			nodeViews: {
				code_block: createCodeBlockNodeView,
				math_block: createBlockMathNodeView,
				math_inline: createInlineMathNodeView,
				...(mode === "guest" ? { question: createLockedQuestionNodeView } : {}),
			},
			attributes: {
				"aria-label":
					mode === "draft"
						? "Interview draft"
						: mode === "guest"
							? "Interview answers"
							: "Summary",
				"data-editor-mode": mode,
			},
			dispatchTransaction(transaction) {
				const currentView = viewRef.current;

				if (!currentView) {
					return;
				}

				const nextState = currentView.state.apply(transaction);
				currentView.updateState(nextState);

				if (transaction.docChanged) {
					onDocumentChangeRef.current?.();
				}
			},
		});

		viewRef.current = editorView;

		return () => {
			if (viewRef.current === editorView) {
				viewRef.current = null;
			}

			editorView.destroy();
			host.replaceChildren();
		};
	}, [initialMarkdown, mode]);

	return <div className={styles.root} data-editor-mode={mode} ref={hostRef} />;
}
