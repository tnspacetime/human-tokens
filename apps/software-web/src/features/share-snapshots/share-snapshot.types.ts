export type ShareSnapshotKind = "interview" | "background_reading";

type ShareSnapshotPageBase = {
	shareId: string;
	title: string;
	summary: string;
	summaryHtml: string;
	contentHtml: string;
};

export type InterviewShareSnapshotPage = ShareSnapshotPageBase & {
	kind: "interview";
	guestName: string | null;
	guestDescription: string | null;
	portraitUrl: string | null;
};

export type BackgroundReadingShareSnapshotPage = ShareSnapshotPageBase & {
	kind: "background_reading";
};

export type ShareSnapshotPage =
	| InterviewShareSnapshotPage
	| BackgroundReadingShareSnapshotPage;

export type ShareSnapshotContent =
	| {
			kind: "interview";
			shareId: string;
			title: string;
			summary: string;
			contentMarkdown: string;
			guestName: string | null;
			guestDescription: string | null;
			portraitUrl: string | null;
	  }
	| {
			kind: "background_reading";
			shareId: string;
			title: string;
			summary: string;
			contentMarkdown: string;
	  };
