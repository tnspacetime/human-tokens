import { createFileRoute, notFound } from "@tanstack/react-router";
import InterviewPage, {
	InterviewNotFoundPage,
} from "../components/InterviewPage";
import {
	getPublishedInterviewHeaders,
	INTERVIEW_NOT_FOUND_HEADERS,
} from "../features/interviews/interview-response";
import { getPublicationPageByPublicId } from "../features/publications/publication.functions";
import { seo } from "../lib/seo";

const SITE_URL = "https://software.human-tokens.dev";

export const Route = createFileRoute("/i/$publicId")({
	loader: async ({ params }) => {
		const publication = await getPublicationPageByPublicId({
			data: { publicId: params.publicId },
		});

		if (!publication) {
			throw notFound({ headers: INTERVIEW_NOT_FOUND_HEADERS });
		}

		return publication;
	},
	headers: ({ loaderData }) =>
		loaderData
			? getPublishedInterviewHeaders(loaderData.interview.publicId)
			: INTERVIEW_NOT_FOUND_HEADERS,
	head: ({ loaderData }) => {
		if (!loaderData) {
			return {
				meta: [
					{ title: "Interview not found | Human Tokens" },
					{ name: "robots", content: "noindex, nofollow" },
				],
			};
		}

		const path = `/i/${loaderData.interview.publicId}`;

		return {
			meta: [
				{ name: "robots", content: "noindex, nofollow" },
				...seo({
					title: `${loaderData.interview.headline} | Human Tokens`,
					description: loaderData.interview.introduction,
					url: path,
					siteUrl: SITE_URL,
					type: "article",
					image: `${SITE_URL}/og.png`,
				}),
			],
		};
	},
	component: InterviewRoute,
	notFoundComponent: InterviewNotFoundPage,
});

function InterviewRoute() {
	const publication = Route.useLoaderData();

	return <InterviewPage publication={publication} />;
}
