import { renderMarkdown } from "../../lib/markdown.server";
import type {
	PublicPublication,
	PublishedBackgroundReading,
	PublishedPublication,
} from "./publication.types";

const publicationDateFormatter = new Intl.DateTimeFormat("en-US", {
	year: "numeric",
	month: "long",
	day: "numeric",
	timeZone: "UTC",
});

async function compileBackgroundReading(
	backgroundReading: PublicPublication["backgroundReading"],
): Promise<PublishedBackgroundReading> {
	const [summaryHtml, contentHtml] = await Promise.all([
		renderMarkdown(backgroundReading.summary),
		renderMarkdown(backgroundReading.contentMarkdown),
	]);

	return {
		title: backgroundReading.title,
		summaryHtml,
		contentHtml,
	};
}

export async function compilePublicationForPage(
	publication: PublicPublication,
): Promise<PublishedPublication> {
	const [contentHtml, introductionHtml, backgroundReading] = await Promise.all([
		renderMarkdown(publication.interview.contentMarkdown),
		renderMarkdown(publication.interview.summary),
		compileBackgroundReading(publication.backgroundReading),
	]);

	return {
		interview: {
			publicId: publication.publicId,
			guest: publication.guest.name,
			role: publication.guest.description,
			date: publication.publicationDate,
			displayDate: publicationDateFormatter.format(
				new Date(`${publication.publicationDate}T00:00:00.000Z`),
			),
			headline: publication.interview.title,
			introduction: publication.interview.summary,
			introductionHtml,
			portraitUrl: publication.interview.portraitUrl ?? null,
			contentHtml,
		},
		backgroundReading,
	};
}
