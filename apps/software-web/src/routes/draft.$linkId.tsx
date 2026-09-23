import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import BackgroundReadingDraftPage from "../components/BackgroundReadingDraftPage";
import DraftUnavailablePage from "../components/DraftUnavailablePage";
import InterviewDraftPage from "../components/InterviewDraftPage";
import {
	DRAFT_TOKEN_PATTERN,
	normalizeDraftLinkId,
} from "../features/drafts/draft-identifiers";
import {
	DRAFT_RESPONSE_HEADERS,
	DRAFT_UNAVAILABLE_HEADERS,
} from "../features/drafts/draft-response";
import {
	getDraftWorkspace,
	openDraftLink,
} from "../features/drafts/drafts.functions";

export const Route = createFileRoute("/draft/$linkId")({
	loader: async ({ params }) => {
		if (DRAFT_TOKEN_PATTERN.test(params.linkId)) {
			const opened = await openDraftLink({
				data: { rawToken: params.linkId },
			});

			if (opened.status === "unavailable") {
				throw redirect({ to: "/draft", replace: true });
			}

			throw redirect({
				to: "/draft/$linkId",
				params: { linkId: opened.linkId },
				replace: true,
			});
		}

		const linkId = normalizeDraftLinkId(params.linkId);

		if (!linkId) {
			throw notFound({ headers: DRAFT_UNAVAILABLE_HEADERS });
		}

		const draft = await getDraftWorkspace({ data: { linkId } });

		if (!draft) {
			throw notFound({ headers: DRAFT_UNAVAILABLE_HEADERS });
		}

		return { draft, linkId };
	},
	component: DraftRoute,
	notFoundComponent: DraftUnavailablePage,
	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData
					? `Prepare ${loaderData.draft.kind === "interview" ? "interview" : "background reading"} | Human Tokens`
					: "Draft link unavailable | Human Tokens",
			},
			{ name: "robots", content: "noindex, nofollow" },
			{ name: "referrer", content: "no-referrer" },
		],
	}),
	headers: ({ loaderData }) =>
		loaderData ? DRAFT_RESPONSE_HEADERS : DRAFT_UNAVAILABLE_HEADERS,
});

function DraftRoute() {
	const data = Route.useLoaderData();

	if (data.draft.kind === "interview") {
		return (
			<InterviewDraftPage
				key={data.linkId}
				draft={data.draft}
				linkId={data.linkId}
			/>
		);
	}

	return (
		<BackgroundReadingDraftPage
			key={data.linkId}
			draft={data.draft}
			linkId={data.linkId}
		/>
	);
}
