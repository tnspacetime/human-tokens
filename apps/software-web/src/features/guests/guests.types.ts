export type PublicGuestSummary = {
	id: string;
	name: string;
};

export type PublicGuestInterview = {
	publicId: string;
	title: string;
	summary: string;
	publicationDate: string;
};

export type PublicGuest = PublicGuestSummary & {
	description: string;
	interviews: PublicGuestInterview[];
};

export type PublicGuestsResponse = {
	version: "1";
	items: PublicGuestSummary[];
	nextCursor: string | null;
};

export type PublicGuestResponse = {
	version: "1";
	item: PublicGuest;
};

export type PublicGuestErrorResponse = {
	version: "1";
	error: {
		code: "not_found";
		message: string;
	};
};
