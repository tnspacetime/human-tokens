import { createFileRoute, notFound } from "@tanstack/react-router";
import ContributionUnavailablePage from "../components/ContributionUnavailablePage";
import { CONTRIBUTION_UNAVAILABLE_HEADERS } from "../features/contribution/contribution-response";

export const Route = createFileRoute("/contribute/")({
	loader: () => {
		throw notFound({ headers: CONTRIBUTION_UNAVAILABLE_HEADERS });
	},
	notFoundComponent: ContributionUnavailablePage,
	head: () => ({
		meta: [
			{
				title: "Contribution link unavailable | Human Tokens",
			},
			{ name: "robots", content: "noindex, nofollow" },
			{ name: "referrer", content: "no-referrer" },
		],
	}),
	headers: () => CONTRIBUTION_UNAVAILABLE_HEADERS,
});
