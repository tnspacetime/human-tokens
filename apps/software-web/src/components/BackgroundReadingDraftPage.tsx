import { useHydrated } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import type { InterviewEditorHandle } from "../features/contribution/editor/InterviewEditor";
import {
	renderBackgroundReadingDraftPreview,
	saveBackgroundReadingDraftWorkspace,
} from "../features/drafts/drafts.functions";
import type { BackgroundReadingDraftWorkspace } from "../features/drafts/drafts.server";
import { formatLocalRevisionTimestamp } from "../lib/helpers";
import type { SaveIntent, SaveState } from "../lib/types";
import DraftContentEditor from "./DraftContentEditor";
import DraftSummaryEditor from "./DraftSummaryEditor";
import DraftTitleField from "./DraftTitleField";
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

type BackgroundReadingDraftPageProps = {
	draft: BackgroundReadingDraftWorkspace;
	linkId: string;
};

type BackgroundReadingPreview = {
	title: string;
	summaryHtml: string;
	contentHtml: string;
};

export default function BackgroundReadingDraftPage({
	draft,
	linkId,
}: BackgroundReadingDraftPageProps) {
	const isHydrated = useHydrated();
	const requestSave = useServerFn(saveBackgroundReadingDraftWorkspace);
	const requestPreview = useServerFn(renderBackgroundReadingDraftPreview);
	const summaryEditorRef = useRef<InterviewEditorHandle>(null);
	const contentEditorRef = useRef<InterviewEditorHandle>(null);
	const changeVersionRef = useRef(0);
	const previewRequestVersionRef = useRef(0);
	const [status, setStatus] = useState(draft.status);
	const [title, setTitle] = useState(draft.title);
	const [isDirty, setIsDirty] = useState(false);
	const [revision, setRevision] = useState(draft.revision);
	const [saveState, setSaveState] = useState<SaveState>("idle");
	const [pendingIntent, setPendingIntent] = useState<SaveIntent | null>(null);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [previewBackgroundReading, setPreviewBackgroundReading] =
		useState<BackgroundReadingPreview | null>(null);
	const [previewIsLoading, setPreviewIsLoading] = useState(false);
	const [previewIsInvalid, setPreviewIsInvalid] = useState(false);
	const saveIsBlocked =
		saveState === "saving" ||
		saveState === "conflict" ||
		saveState === "unavailable";
	const hasStatusError =
		saveState === "conflict" ||
		saveState === "unavailable" ||
		saveState === "error";
	const localRevisionTimestamp = useMemo(
		() => (isHydrated ? formatLocalRevisionTimestamp(revision) : null),
		[isHydrated, revision],
	);

	let saveMessage = localRevisionTimestamp
		? `Updated at ${localRevisionTimestamp}`
		: "Updated";

	if (saveState === "saving") {
		saveMessage =
			pendingIntent === "finalize"
				? "Finalizing…"
				: pendingIntent === "unfinalize"
					? "Unfinalizing…"
					: "Saving…";
	} else if (saveState === "conflict") {
		saveMessage = "This draft changed elsewhere. Reload before saving.";
	} else if (saveState === "unavailable") {
		saveMessage = "Draft access expired. Reopen the secret link.";
	} else if (saveState === "error") {
		saveMessage = "Save failed. Try again.";
	} else if (saveState === "saved") {
		saveMessage = localRevisionTimestamp
			? `Saved at ${localRevisionTimestamp}`
			: "Saved";
	}

	function markDraftChanged() {
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

	async function persistDraft(intent: SaveIntent) {
		if ((intent === "save" && !isDirty) || saveIsBlocked) {
			return;
		}

		const changeVersion = changeVersionRef.current;
		const draftToSave = {
			title,
			summary: summaryEditorRef.current?.getMarkdown() ?? draft.summary,
			contentMarkdown:
				contentEditorRef.current?.getMarkdown() ?? draft.contentMarkdown,
		};
		setPendingIntent(intent);
		setSaveState("saving");

		try {
			const result = await requestSave({
				data: {
					linkId,
					...draftToSave,
					revision,
					intent,
				},
			});

			if (result.status !== "saved") {
				setSaveState(
					result.status === "conflict" || result.status === "unavailable"
						? result.status
						: "error",
				);
				return;
			}

			setRevision(result.revision);
			setStatus(result.draftStatus);
			const hasNewChanges = changeVersionRef.current !== changeVersion;
			setIsDirty(hasNewChanges);
			setSaveState(hasNewChanges ? "idle" : "saved");
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

		setPreviewBackgroundReading(null);
		setPreviewIsInvalid(false);
		setPreviewIsLoading(true);

		void requestPreview({
			data: {
				linkId,
				title,
				summary: summaryEditorRef.current?.getMarkdown() ?? draft.summary,
				contentMarkdown:
					contentEditorRef.current?.getMarkdown() ?? draft.contentMarkdown,
			},
		})
			.then((result) => {
				if (previewRequestVersion !== previewRequestVersionRef.current) {
					return;
				}

				if (result.status === "rendered") {
					setPreviewBackgroundReading(result.preview);
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
				<div className="flex flex-col gap-6">
					<header className="flex flex-col gap-4 px-1 sm:flex-row sm:items-start sm:justify-between">
						<div className="flex flex-wrap items-baseline gap-3">
							<h1 className="m-0 text-[1.1rem] leading-none font-semibold tracking-tight">
								Background reading
							</h1>
							<span className="text-[0.8rem] font-medium text-(--sea-ink-soft) capitalize">
								{status}
							</span>
						</div>
						<div className="flex flex-col items-stretch gap-2 sm:items-end">
							<div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
								<button
									type="button"
									onClick={() => void persistDraft("save")}
									disabled={!isDirty || saveIsBlocked}
									className="inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent px-1 text-[0.85rem] font-semibold text-[#0071e3] transition-opacity disabled:cursor-default disabled:opacity-35 enabled:hover:opacity-70"
								>
									{saveState === "saving" && pendingIntent === "save"
										? "Saving…"
										: "Save"}
								</button>
								<Sheet open={previewOpen} onOpenChange={setSheetOpen}>
									<SheetTrigger asChild>
										<button
											type="button"
											className="inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent px-1 text-[0.85rem] font-semibold text-[#0071e3] transition-opacity hover:opacity-70"
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
												Preview this background reading using its homepage
												presentation.
											</SheetDescription>
										</SheetHeader>
										{previewIsLoading ? (
											<p className="m-0 px-6 py-[clamp(3.5rem,8vw,6rem)] text-center text-[0.95rem] text-(--sea-ink-soft) sm:px-10">
												Rendering preview…
											</p>
										) : previewIsInvalid ? (
											<p className="m-0 px-6 py-[clamp(3.5rem,8vw,6rem)] text-center text-[0.95rem] text-(--sea-ink-soft) sm:px-10">
												The preview could not be generated from this document.
											</p>
										) : previewBackgroundReading ? (
											<section className="w-full bg-white dark:bg-black">
												<PageContainer className="py-[clamp(4.5rem,10vw,8rem)]">
													<div className="mx-auto max-w-2xl">
														<header>
															<h2 className="m-0 max-w-[15ch] text-balance text-[clamp(2.4rem,6vw,4.5rem)] leading-[0.98] font-semibold tracking-[-0.055em]">
																{previewBackgroundReading.title}
															</h2>
															<Markdown
																html={previewBackgroundReading.summaryHtml}
																className="mt-5 max-w-160 text-pretty text-[clamp(1.05rem,2vw,1.2rem)] leading-normal tracking-[-0.018em] text-(--sea-ink-soft) *:first:mt-0 *:last:mb-0"
															/>
														</header>
														<Markdown
															html={previewBackgroundReading.contentHtml}
															className="mt-[clamp(3.5rem,8vw,6rem)] *:first:mt-0 *:last:mb-0"
														/>
													</div>
												</PageContainer>
											</section>
										) : null}
									</SheetContent>
								</Sheet>
								{status === "draft" ? (
									<button
										type="button"
										onClick={() => void persistDraft("finalize")}
										disabled={saveIsBlocked}
										className="inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent px-1 text-[0.85rem] font-semibold text-[#0071e3] transition-opacity disabled:cursor-default disabled:opacity-35 enabled:hover:opacity-70"
									>
										{saveState === "saving" && pendingIntent === "finalize"
											? "Finalizing…"
											: "Finalize"}
									</button>
								) : status === "ready" ? (
									<button
										type="button"
										onClick={() => void persistDraft("unfinalize")}
										disabled={saveIsBlocked}
										className="inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent px-1 text-[0.85rem] font-semibold text-[#0071e3] transition-opacity disabled:cursor-default disabled:opacity-35 enabled:hover:opacity-70"
									>
										{saveState === "saving" && pendingIntent === "unfinalize"
											? "Unfinalizing…"
											: "Unfinalize"}
									</button>
								) : null}
							</div>
							<p
								aria-live="polite"
								className={`m-0 text-[0.8rem] ${hasStatusError ? "text-red-600 dark:text-red-400" : "text-(--sea-ink-soft)"}`}
								role={hasStatusError ? "alert" : "status"}
							>
								{saveMessage}
							</p>
						</div>
					</header>
					<section aria-label="Draft details" className="grid gap-5 px-1">
						<DraftTitleField
							value={title}
							onChange={(value) => {
								setTitle(value);
								markDraftChanged();
							}}
						/>
						<DraftSummaryEditor
							initialMarkdown={draft.summary}
							onDocumentChange={markDraftChanged}
							ref={summaryEditorRef}
						/>
					</section>
					<DraftContentEditor
						ariaLabel="Background reading draft editor"
						initialMarkdown={draft.contentMarkdown}
						onDocumentChange={markDraftChanged}
						ref={contentEditorRef}
					/>
				</div>
			</PageContainer>
		</main>
	);
}
