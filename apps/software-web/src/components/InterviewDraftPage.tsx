import { useHydrated } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import type { InterviewEditorHandle } from "../features/contribution/editor/InterviewEditor";
import {
	createInterviewContributionLinkForDraft,
	saveInterviewDraftWorkspace,
} from "../features/drafts/drafts.functions";
import type { InterviewDraftWorkspace } from "../features/drafts/drafts.server";
import { formatLocalRevisionTimestamp } from "../lib/helpers";
import type { ContributionLink, SaveIntent, SaveState } from "../lib/types";
import DraftContentEditor from "./DraftContentEditor";
import DraftSummaryEditor from "./DraftSummaryEditor";
import DraftTitleField from "./DraftTitleField";
import PageContainer from "./PageContainer";

type InterviewDraftPageProps = {
	draft: InterviewDraftWorkspace;
	linkId: string;
};

export default function InterviewDraftPage({
	draft,
	linkId,
}: InterviewDraftPageProps) {
	const isHydrated = useHydrated();
	const requestSave = useServerFn(saveInterviewDraftWorkspace);
	const requestContributionLink = useServerFn(
		createInterviewContributionLinkForDraft,
	);
	const summaryEditorRef = useRef<InterviewEditorHandle>(null);
	const contentEditorRef = useRef<InterviewEditorHandle>(null);
	const changeVersionRef = useRef(0);
	const [status, setStatus] = useState(draft.status);
	const [title, setTitle] = useState(draft.title);
	const [isDirty, setIsDirty] = useState(false);
	const [revision, setRevision] = useState(draft.revision);
	const [guestContribution, setGuestContribution] = useState(
		draft.guestContribution,
	);
	const [saveState, setSaveState] = useState<SaveState>("idle");
	const [pendingIntent, setPendingIntent] = useState<SaveIntent | null>(null);
	const [contributionLink, setContributionLink] =
		useState<ContributionLink | null>(null);
	const [isCreatingContributionLink, setIsCreatingContributionLink] =
		useState(false);
	const [contributionLinkError, setContributionLinkError] = useState(false);
	const [contributionLinkCopied, setContributionLinkCopied] = useState(false);
	const saveIsBlocked =
		saveState === "saving" ||
		saveState === "conflict" ||
		saveState === "unavailable";
	const hasStatusError =
		saveState === "conflict" ||
		saveState === "invalid" ||
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
	} else if (saveState === "invalid") {
		saveMessage = "Published interviews must contain a valid question.";
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
					result.status === "conflict" ||
						result.status === "invalid" ||
						result.status === "unavailable"
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

	async function createGuestLink() {
		if (isCreatingContributionLink) {
			return;
		}

		setIsCreatingContributionLink(true);
		setContributionLinkError(false);
		setContributionLinkCopied(false);

		try {
			const result = await requestContributionLink({ data: { linkId } });

			if (result.status !== "created") {
				setContributionLinkError(true);
				return;
			}

			setContributionLink(result.link);
			setGuestContribution({ status: "awaiting" });
		} catch {
			setContributionLinkError(true);
		} finally {
			setIsCreatingContributionLink(false);
		}
	}

	async function copyGuestLink() {
		if (!contributionLink) {
			return;
		}

		try {
			await navigator.clipboard.writeText(contributionLink.url);
			setContributionLinkCopied(true);
			setContributionLinkError(false);
		} catch {
			setContributionLinkError(true);
		}
	}

	return (
		<main className="bg-(--surface) px-4 py-16 text-(--sea-ink) sm:py-24">
			<PageContainer className="mx-auto flex max-w-6xl flex-col gap-12">
				<div className="flex flex-col gap-6">
					<header className="flex flex-col gap-4 px-1 sm:flex-row sm:items-start sm:justify-between">
						<div className="flex flex-wrap items-baseline gap-3">
							<h1 className="m-0 text-[1.1rem] leading-none font-semibold tracking-tight">
								Interview
							</h1>
							<span className="text-[0.8rem] font-medium text-(--sea-ink-soft) capitalize">
								{status}
							</span>
							{guestContribution ? (
								<span className="text-[0.8rem] font-medium text-(--sea-ink-soft)">
									{guestContribution.status === "submitted"
										? "Guest submitted"
										: "Awaiting guest"}
								</span>
							) : null}
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
								<button
									type="button"
									onClick={() => void createGuestLink()}
									disabled={isCreatingContributionLink}
									className="inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent px-1 text-[0.85rem] font-semibold text-[#0071e3] transition-opacity disabled:cursor-default disabled:opacity-35 enabled:hover:opacity-70"
								>
									{isCreatingContributionLink ? "Creating…" : "Guest link"}
								</button>
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
					{contributionLink ? (
						<section
							aria-label="Guest link"
							className="flex flex-col gap-3 rounded-2xl bg-(--surface-strong) px-4 py-4 sm:flex-row sm:items-center"
						>
							<div className="min-w-0 flex-1">
								<p className="m-0 break-all text-[0.85rem] text-(--sea-ink)">
									{contributionLink.url}
								</p>
								<p className="mt-1 mb-0 text-[0.75rem] text-(--sea-ink-soft)">
									Expires{" "}
									{formatLocalRevisionTimestamp(contributionLink.expiresAt)}
								</p>
							</div>
							<button
								type="button"
								onClick={() => void copyGuestLink()}
								className="inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-(--sea-ink) px-5 text-[0.85rem] font-semibold text-(--bg-base) transition-opacity hover:opacity-80"
							>
								{contributionLinkCopied ? "Copied" : "Copy link"}
							</button>
						</section>
					) : null}
					{contributionLinkError ? (
						<p
							className="m-0 px-1 text-[0.8rem] text-red-600 dark:text-red-400"
							role="alert"
						>
							The guest link could not be created or copied. Try again.
						</p>
					) : null}
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
						ariaLabel="Interview draft editor"
						initialMarkdown={draft.contentMarkdown}
						onDocumentChange={markDraftChanged}
						ref={contentEditorRef}
					/>
				</div>
			</PageContainer>
		</main>
	);
}
