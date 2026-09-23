import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import ContributePage from "../components/ContributePage";
import ContributionUnavailablePage from "../components/ContributionUnavailablePage";
import {
	getContributionWorkspacePage,
	openContributionLink,
} from "../features/contribution/contribution.functions";
import {
	CONTRIBUTION_TOKEN_PATTERN,
	normalizeContributionLinkId,
} from "../features/contribution/contribution-identifiers";
import {
	CONTRIBUTION_RESPONSE_HEADERS,
	CONTRIBUTION_UNAVAILABLE_HEADERS,
} from "../features/contribution/contribution-response";

export const Route = createFileRoute("/contribute/$linkId")({
	loader: async ({ params }) => {
		if (CONTRIBUTION_TOKEN_PATTERN.test(params.linkId)) {
			const opened = await openContributionLink({
				data: { rawToken: params.linkId },
			});

			if (opened.status === "unavailable") {
				throw redirect({ to: "/contribute", replace: true });
			}

			throw redirect({
				to: "/contribute/$linkId",
				params: { linkId: opened.linkId },
				replace: true,
			});
		}

		const linkId = normalizeContributionLinkId(params.linkId);

		if (!linkId) {
			throw notFound({ headers: CONTRIBUTION_UNAVAILABLE_HEADERS });
		}

		const contribution = await getContributionWorkspacePage({
			data: { linkId },
		});

		if (!contribution) {
			throw notFound({ headers: CONTRIBUTION_UNAVAILABLE_HEADERS });
		}

		return contribution;
	},
	component: ContributeRoute,
	notFoundComponent: ContributionUnavailablePage,
	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData
					? "Contribute | Human Tokens"
					: "Contribution link unavailable | Human Tokens",
			},
			{ name: "robots", content: "noindex, nofollow" },
			{ name: "referrer", content: "no-referrer" },
		],
	}),
	headers: ({ loaderData }) =>
		loaderData
			? CONTRIBUTION_RESPONSE_HEADERS
			: CONTRIBUTION_UNAVAILABLE_HEADERS,
});

function ContributeRoute() {
	const contribution = Route.useLoaderData();

	return <ContributePage contribution={contribution} />;
}
