import type { Ref } from "react";
import InterviewEditor, {
	type InterviewEditorHandle,
} from "../features/contribution/editor/InterviewEditor";

type DraftContentEditorProps = {
	ariaLabel: string;
	initialMarkdown: string;
	onDocumentChange: () => void;
	ref?: Ref<InterviewEditorHandle>;
};

export default function DraftContentEditor({
	ariaLabel,
	initialMarkdown,
	onDocumentChange,
	ref,
}: DraftContentEditorProps) {
	return (
		<section
			aria-label={ariaLabel}
			className="overflow-hidden rounded-[1.5rem] bg-(--surface-strong)"
		>
			<InterviewEditor
				initialMarkdown={initialMarkdown}
				mode="draft"
				onDocumentChange={onDocumentChange}
				ref={ref}
			/>
		</section>
	);
}
