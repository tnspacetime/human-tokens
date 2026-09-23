import type { Ref } from "react";
import InterviewEditor, {
	type InterviewEditorHandle,
} from "../features/contribution/editor/InterviewEditor";

type DraftSummaryEditorProps = {
	initialMarkdown: string;
	onDocumentChange: () => void;
	ref?: Ref<InterviewEditorHandle>;
};

export default function DraftSummaryEditor({
	initialMarkdown,
	onDocumentChange,
	ref,
}: DraftSummaryEditorProps) {
	return (
		<div className="grid gap-2">
			<span
				id="draft-summary-label"
				className="text-[0.72rem] font-semibold tracking-[0.07em] text-(--sea-ink-soft) uppercase"
			>
				Summary
			</span>
			<section
				aria-labelledby="draft-summary-label"
				className="overflow-hidden rounded-xl bg-(--surface-strong)"
			>
				<InterviewEditor
					initialMarkdown={initialMarkdown}
					mode="summary"
					onDocumentChange={onDocumentChange}
					ref={ref}
				/>
			</section>
		</div>
	);
}
