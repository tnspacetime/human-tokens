import type { ContributionWorkspace } from "../features/contribution/contribution.server";

export type SaveState =
	| "idle"
	| "saving"
	| "saved"
	| "conflict"
	| "invalid"
	| "unavailable"
	| "error";

export type SaveIntent = "save" | "finalize" | "unfinalize";

export type ContributionLink = {
	url: string;
	expiresAt: string;
};

export type ContributionPageData = ContributionWorkspace & {
	linkId: string;
	summaryHtml: string;
};

export type ContributionPageProps = {
	contribution: ContributionPageData;
};

export type ContributionSaveState =
	| "idle"
	| "saving"
	| "saved"
	| "submitted"
	| "conflict"
	| "invalid"
	| "unavailable"
	| "error";

export type ContributionAnswerRecorderProps = {
	linkId: string;
	markdown: string;
};

export type ContributionRecorderState =
	| "idle"
	| "requesting"
	| "recording"
	| "finishing"
	| "error";

export type ContributionRecordedAnswer = {
	audioUrl: string;
	transcript: string;
};
