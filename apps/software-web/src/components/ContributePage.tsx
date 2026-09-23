import { useHydrated } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import {
	renderContributionPreview,
	saveContributionWorkspace,
} from "../features/contribution/contribution.functions";
import InterviewEditor, {
	type InterviewEditorHandle,
} from "../features/contribution/editor/InterviewEditor";
import { formatLocalRevisionTimestamp } from "../lib/helpers";
import type {
	ContributionPageProps,
	ContributionSaveState,
} from "../lib/types";
import ContributionAnswerRecorder from "./ContributionAnswerRecorder";
import ContributionInterviewPhotoField from "./ContributionInterviewPhotoField";
import InterviewArticle from "./InterviewArticle";
import Markdown from "./Markdown";
import PageContainer from "./PageContainer";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "./ui/sheet";

export default function ContributePage({
	contribution,
}: ContributionPageProps) {
	const isHydrated = useHydrated();
	const requestSave = useServerFn(saveContributionWorkspace);
	const requestPreview = useServerFn(renderContributionPreview);
	const editorRef = useRef<InterviewEditorHandle>(null);
	const changeVersionRef = useRef(0);
	const previewRequestVersionRef = useRef(0);
	const [isDirty, setIsDirty] = useState(false);
	const [revision, setRevision] = useState(contribution.revision);
	const [submittedAt, setSubmittedAt] = useState(contribution.submittedAt);
	const [saveState, setSaveState] = useState<ContributionSaveState>("idle");
	const [pendingIntent, setPendingIntent] = useState<"save" | "submit" | null>(
		null,
	);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [portraitImageUrl, setPortraitImageUrl] = useState(
		contribution.portraitImageUrl,
	);
	const [previewContentHtml, setPreviewContentHtml] = useState<string | null>(
		null,
	);
	const [previewIsLoading, setPreviewIsLoading] = useState(false);
	const [previewIsInvalid, setPreviewIsInvalid] = useState(false);
	const saveIsBlocked =
		saveState === "saving" ||
		saveState === "conflict" ||
		saveState === "unavailable";
	const hasSaveError =
		saveState === "conflict" ||
		saveState === "invalid" ||
		saveState === "unavailable" ||
		saveState === "error";
	const localRevisionTimestamp = useMemo(
		() => (isHydrated ? formatLocalRevisionTimestamp(revision) : null),
		[isHydrated, revision],
	);
	const localSubmittedTimestamp = useMemo(
		() =>
			isHydrated && submittedAt
				? formatLocalRevisionTimestamp(submittedAt)
				: null,
		[isHydrated, submittedAt],
	);
	const renderedSummaryHtml = contribution.summaryHtml;

	let saveMessage = localRevisionTimestamp
		? `Updated at ${localRevisionTimestamp}`
		: "Updated";

	if (saveState === "saving") {
		saveMessage = pendingIntent === "submit" ? "Submitting…" : "Saving…";
	} else if (saveState === "saved") {
		saveMessage = localRevisionTimestamp
			? `Saved at ${localRevisionTimestamp}`
			: "Saved";
	} else if (saveState === "submitted") {
		saveMessage = localSubmittedTimestamp
			? `Submitted at ${localSubmittedTimestamp}`
			: "Submitted";
	} else if (saveState === "conflict") {
		saveMessage = "This interview changed elsewhere. Reload before saving.";
	} else if (saveState === "invalid") {
		saveMessage =
			"The interview questions changed or the published document is invalid.";
	} else if (saveState === "unavailable") {
		saveMessage = "This guest link is no longer available.";
	} else if (saveState === "error") {
		saveMessage = "Save failed. Try again.";
	}

	function markContributionChanged() {
		changeVersionRef.current += 1;
		setIsDirty(true);
		setSaveState((currentState) =>
			currentState === "saving" ||
			currentState === "conflict" ||
			currentState === "unavailable"
				? currentState
				: "idle",
		);
	}

	async function persistContribution(intent: "save" | "submit") {
		if (
			(intent === "save" && !isDirty) ||
			(intent === "submit" && submittedAt !== null) ||
			saveIsBlocked
		) {
			return;
		}

		const changeVersion = changeVersionRef.current;
		const markdownToSave =
			editorRef.current?.getMarkdown() ?? contribution.contentMarkdown;
		setPendingIntent(intent);
		setSaveState("saving");

		try {
			const result = await requestSave({
				data: {
					linkId: contribution.linkId,
					contentMarkdown: markdownToSave,
					revision,
					intent,
				},
			});

			if (result.status !== "saved") {
				setSaveState(
					result.status === "conflict" ||
						result.status === "invalid" ||
						result.status === "unavailable"
						? result.status
						: "error",
				);
				return;
			}

			setRevision(result.revision);
			setSubmittedAt(result.submittedAt);
			const hasNewChanges = changeVersionRef.current !== changeVersion;
			setIsDirty(hasNewChanges);
			setSaveState(
				hasNewChanges ? "idle" : intent === "submit" ? "submitted" : "saved",
			);
		} catch {
			setSaveState("error");
		} finally {
			setPendingIntent(null);
		}
	}

	function setSheetOpen(open: boolean) {
		const previewRequestVersion = ++previewRequestVersionRef.current;
		setPreviewOpen(open);

		if (!open) {
			setPreviewIsLoading(false);
			return;
		}

		setPreviewContentHtml(null);
		setPreviewIsInvalid(false);
		setPreviewIsLoading(true);

		void requestPreview({
			data: {
				linkId: contribution.linkId,
				contentMarkdown:
					editorRef.current?.getMarkdown() ?? contribution.contentMarkdown,
			},
		})
			.then((result) => {
				if (previewRequestVersion !== previewRequestVersionRef.current) {
					return;
				}

				if (result.status === "rendered" && result.contentHtml) {
					setPreviewContentHtml(result.contentHtml);
					return;
				}

				setPreviewIsInvalid(true);
			})
			.catch(() => {
				if (previewRequestVersion === previewRequestVersionRef.current) {
					setPreviewIsInvalid(true);
				}
			})
			.finally(() => {
				if (previewRequestVersion === previewRequestVersionRef.current) {
					setPreviewIsLoading(false);
				}
			});
	}

	return (
		<main className="bg-(--surface) px-4 py-16 text-(--sea-ink) sm:py-24">
			<PageContainer className="mx-auto flex max-w-6xl flex-col gap-12">
				<header className="mx-auto w-full max-w-160">
					<h1 className="m-0 text-4xl leading-tight font-semibold tracking-[-0.04em] sm:text-6xl">
						{contribution.title}
					</h1>
					{renderedSummaryHtml ? (
						<Markdown
							html={renderedSummaryHtml}
							className="mt-6 max-w-xl text-lg leading-8 text-(--sea-ink-soft) *:first:mt-0 *:last:mb-0"
						/>
					) : null}
				</header>

				<div className="grid gap-4">
					<div className="flex flex-col gap-4 rounded-[1.75rem] bg-(--surface-strong) p-3 md:flex-row md:items-center md:justify-between md:gap-6">
						<div className="min-w-0 flex-1">
							<ContributionInterviewPhotoField
								linkId={contribution.linkId}
								imageUrl={portraitImageUrl}
								onImageUrlChange={setPortraitImageUrl}
							/>
						</div>
						<div className="flex shrink-0 flex-col gap-2 md:items-end">
							<div className="flex w-full items-center gap-1 rounded-full bg-(--surface) p-1.5 md:w-auto">
								<ContributionAnswerRecorder
									linkId={contribution.linkId}
									markdown={contribution.contentMarkdown}
								/>
								<button
									type="button"
									onClick={() => {
										void persistContribution("save");
									}}
									disabled={!isDirty || saveIsBlocked}
									className="inline-flex min-h-10 flex-1 cursor-pointer items-center justify-center border-0 bg-transparent px-4 text-[0.85rem] font-semibold text-[#0071e3] transition-opacity disabled:cursor-default disabled:opacity-35 enabled:hover:opacity-60 md:flex-none"
								>
									{saveState === "saving" && pendingIntent === "save"
										? "Saving…"
										: "Save"}
								</button>
								<Sheet open={previewOpen} onOpenChange={setSheetOpen}>
									<SheetTrigger asChild>
										<button
											type="button"
											className="inline-flex min-h-10 flex-1 cursor-pointer items-center justify-center border-0 bg-transparent px-4 text-[0.85rem] font-semibold text-[#0071e3] transition-opacity hover:opacity-60 md:flex-none"
										>
											Preview
										</button>
									</SheetTrigger>
									<SheetContent className="w-full gap-0 overflow-y-auto border-l-0 bg-[#f5f5f7] p-0 text-(--sea-ink) sm:max-w-[min(52rem,calc(100vw-2rem))] dark:bg-[#1d1d1f]">
										<SheetHeader className="sticky top-0 z-10 border-b bg-[#f5f5f7]/95 px-6 py-4 pr-14 backdrop-blur-xl dark:bg-[#1d1d1f]/95">
											<SheetTitle className="text-[0.95rem] tracking-[-0.015em]">
												Preview
											</SheetTitle>
											<SheetDescription className="sr-only">
												Preview this interview using its homepage presentation.
											</SheetDescription>
										</SheetHeader>
										<div className="px-6 py-[clamp(3.5rem,8vw,6rem)] sm:px-10">
											{previewIsLoading ? (
												<p className="m-0 text-center text-[0.95rem] text-(--sea-ink-soft)">
													Rendering preview…
												</p>
											) : previewIsInvalid ? (
												<p className="m-0 text-center text-[0.95rem] text-(--sea-ink-soft)">
													The preview could not be generated from this document.
												</p>
											) : previewContentHtml ? (
												<InterviewArticle
													portraitUrl={portraitImageUrl}
													showPortrait
													interview={{
														headline: contribution.title,
														introduction: contribution.summary,
														introductionHtml: renderedSummaryHtml,
														contentHtml: previewContentHtml,
													}}
												/>
											) : null}
										</div>
									</SheetContent>
								</Sheet>
								<button
									type="button"
									onClick={() => {
										void persistContribution("submit");
									}}
									disabled={submittedAt !== null || saveIsBlocked}
									className="inline-flex min-h-10 flex-1 cursor-pointer items-center justify-center border-0 bg-transparent px-4 text-[0.85rem] font-semibold text-[#0071e3] transition-opacity disabled:cursor-default disabled:opacity-35 enabled:hover:opacity-60 md:flex-none"
								>
									{saveState === "saving" && pendingIntent === "submit"
										? "Submitting…"
										: submittedAt
											? "Submitted"
											: "Submit"}
								</button>
							</div>
							<p
								aria-live="polite"
								className={`m-0 px-1 text-[0.8rem] ${hasSaveError ? "text-red-600 dark:text-red-400" : "text-(--sea-ink-soft)"}`}
								role={hasSaveError ? "alert" : "status"}
							>
								{saveMessage}
							</p>
						</div>
					</div>
					<section
						aria-label="Interview editor workspace"
						className="overflow-hidden rounded-[1.5rem] bg-(--surface-strong)"
					>
						<InterviewEditor
							initialMarkdown={contribution.contentMarkdown}
							mode="guest"
							onDocumentChange={markContributionChanged}
							ref={editorRef}
						/>
					</section>
				</div>
			</PageContainer>
		</main>
	);
}
