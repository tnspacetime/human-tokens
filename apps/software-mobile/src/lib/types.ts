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
  version: '1';
  items: PublicGuestSummary[];
  nextCursor: string | null;
};

export type PublicGuestResponse = {
  version: '1';
  item: PublicGuest;
};

export type PublicInterviewSummary = {
  publicId: string;
  title: string;
  publicationDate: string;
};

export type PublicInterviewsResponse = {
  version: '1';
  items: PublicInterviewSummary[];
  nextCursor: string | null;
};

export type PublicContentGuest = {
  id: string;
  name: string;
  description: string;
};

export type PublicContentPair = {
  publicId: string;
  publicationDate: string;
  guest: PublicContentGuest;
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
  version: '1';
  item: PublicContentPair | null;
};

export type PublicInterviewResponse = {
  version: '1';
  item: PublicContentPair;
};

export type PublicContentErrorResponse = {
  version: '1';
  error: {
    code: 'not_found';
    message: string;
  };
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
  expiresAt: string | null;
};

export type SpecialItemKind = 'link' | 'note' | 'sponsored';

export type SpecialItem = {
  id: string;
  kind: SpecialItemKind;
  title: string;
  body: string;
  url: string | null;
  publishedAt: string;
};

export type ExtrasResponse = {
  version: '1';
  announcement: Announcement | null;
  specialItems: SpecialItem[];
};
