export type PublicInterviewSummary = {
	publicId: string;
	title: string;
	publicationDate: string;
};

export type PublicInterviewsResponse = {
	version: "1";
	items: PublicInterviewSummary[];
	nextCursor: string | null;
};

export type PublicInterviewsErrorResponse = {
	version: "1";
	error: {
		code: "invalid_cursor";
		message: string;
	};
};
