import { createFileRoute, notFound } from "@tanstack/react-router";
import DraftUnavailablePage from "../components/DraftUnavailablePage";
import { DRAFT_UNAVAILABLE_HEADERS } from "../features/drafts/draft-response";

export const Route = createFileRoute("/draft/")({
	loader: () => {
		throw notFound({ headers: DRAFT_UNAVAILABLE_HEADERS });
	},
	notFoundComponent: DraftUnavailablePage,
	head: () => ({
		meta: [
			{ title: "Draft link unavailable | Human Tokens" },
			{ name: "robots", content: "noindex, nofollow" },
			{ name: "referrer", content: "no-referrer" },
		],
	}),
	headers: () => DRAFT_UNAVAILABLE_HEADERS,
});
