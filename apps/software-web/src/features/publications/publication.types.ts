export type PublicPublicationGuest = {
	id: string;
	name: string;
	description: string;
};

export type PublicPublication = {
	publicId: string;
	publicationDate: string;
	guest: PublicPublicationGuest;
	interview: {
		title: string;
		summary: string;
		contentMarkdown: string;
		portraitUrl: string | null;
	};
	backgroundReading: {
		title: string;
		summary: string;
		contentMarkdown: string;
	};
};

export type PublicLatestResponse = {
	version: "1";
	item: PublicPublication | null;
};

export type PublicPublicationResponse = {
	version: "1";
	item: PublicPublication;
};

export type PublicPublicationErrorResponse = {
	version: "1";
	error: {
		code: "not_found";
		message: string;
	};
};

export type PublishedInterview = {
	publicId: string;
	guest: string;
	role: string;
	date: string;
	displayDate: string;
	headline: string;
	introduction: string;
	introductionHtml: string;
	portraitUrl: string | null;
	contentHtml: string;
};

export type PublishedBackgroundReading = {
	title: string;
	summaryHtml: string;
	contentHtml: string;
};

export type PublishedPublication = {
	interview: PublishedInterview;
	backgroundReading: PublishedBackgroundReading;
};
