import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { isValidInterviewPublicId } from "../interviews/interview-public";
import {
	getPublishedInterviewHeaders,
	INTERVIEW_NOT_FOUND_HEADERS,
} from "../interviews/interview-response";
import { getLatestPublication, getPublication } from "./publication.server";
import { PUBLISHED_HOMEPAGE_CACHE_HEADERS } from "./publication-cache";
import { compilePublicationForPage } from "./publication-presentation.server";

function setHeaders(headers: Record<string, string>) {
	for (const [name, value] of Object.entries(headers)) {
		setResponseHeader(name, value);
	}
}

export const getLatestPublicationPage = createServerFn({
	method: "GET",
}).handler(async () => {
	setHeaders(PUBLISHED_HOMEPAGE_CACHE_HEADERS);
	const latest = await getLatestPublication();
	const latestPublication = latest.item;

	if (!latestPublication) {
		return null;
	}

	return compilePublicationForPage(latestPublication);
});

export const getPublicationPageByPublicId = createServerFn({ method: "GET" })
	.validator((input: unknown) => {
		if (
			typeof input !== "object" ||
			input === null ||
			!("publicId" in input) ||
			typeof input.publicId !== "string"
		) {
			return { publicId: "" };
		}

		return { publicId: input.publicId };
	})
	.handler(async ({ data }) => {
		if (!isValidInterviewPublicId(data.publicId)) {
			setHeaders(INTERVIEW_NOT_FOUND_HEADERS);
			return null;
		}

		const response = await getPublication(data.publicId);

		if (!response) {
			setHeaders(INTERVIEW_NOT_FOUND_HEADERS);
			return null;
		}

		setHeaders(getPublishedInterviewHeaders(response.item.publicId));
		return compilePublicationForPage(response.item);
	});
