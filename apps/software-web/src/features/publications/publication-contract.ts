import type { PublicPublication } from "./publication.types";

export function normalizePublicPublication(
	publication: PublicPublication,
): PublicPublication {
	return {
		publicId: publication.publicId,
		publicationDate: publication.publicationDate,
		guest: {
			id: publication.guest.id,
			name: publication.guest.name,
			description: publication.guest.description,
		},
		interview: {
			title: publication.interview.title,
			summary: publication.interview.summary,
			contentMarkdown: publication.interview.contentMarkdown,
			portraitUrl: publication.interview.portraitUrl ?? null,
		},
		backgroundReading: {
			title: publication.backgroundReading.title,
			summary: publication.backgroundReading.summary,
			contentMarkdown: publication.backgroundReading.contentMarkdown,
		},
	};
}
