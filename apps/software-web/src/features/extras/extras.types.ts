export type Announcement = {
	id: string;
	title: string;
	body: string;
	publishedAt: string;
	expiresAt: string | null;
};

export type SpecialItemKind = "link" | "note" | "sponsored";

export type SpecialItem = {
	id: string;
	kind: SpecialItemKind;
	title: string;
	body: string;
	url: string | null;
	publishedAt: string;
};

export type ExtrasResponse = {
	version: "1";
	announcement: Announcement | null;
	specialItems: SpecialItem[];
};
