import { createFileRoute, useRouter } from "@tanstack/react-router";
import HomePage from "../components/home/HomePage";
import HomePageState from "../components/home/HomePageState";
import { getLatestPublicationPage } from "../features/publications/publication.functions";
import { PUBLISHED_HOMEPAGE_CACHE_HEADERS } from "../features/publications/publication-cache";
import { seo } from "../lib/seo";

const SITE_URL = "https://software.human-tokens.dev";

export const Route = createFileRoute("/")({
	loader: () => getLatestPublicationPage(),
	headers: () => PUBLISHED_HOMEPAGE_CACHE_HEADERS,
	head: ({ loaderData }) =>
		loaderData
			? {
					meta: seo({
						title: `${loaderData.interview.headline} | Human Tokens`,
						description: loaderData.interview.introduction,
						url: SITE_URL,
						siteUrl: SITE_URL,
						image: `${SITE_URL}/og.png`,
					}),
				}
			: {},
	pendingComponent: () => (
		<HomePageState message="Loading the latest reading." pending />
	),
	errorComponent: HomeRouteError,
	component: HomeRoute,
});

function HomeRoute() {
	const publication = Route.useLoaderData();

	if (!publication) {
		return (
			<HomePageState
				message="Check back soon for a new reading."
				showMobileApps
			/>
		);
	}

	return <HomePage publication={publication} />;
}

function HomeRouteError() {
	const router = useRouter();

	return (
		<HomePageState
			message="There was an error. Try again below."
			onRetry={() => {
				void router.invalidate({ sync: true });
			}}
		/>
	);
}
