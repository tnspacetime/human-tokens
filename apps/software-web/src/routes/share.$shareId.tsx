import { createFileRoute, notFound } from "@tanstack/react-router";

import ShareSnapshotPage from "../components/share/ShareSnapshotPage";
import ShareSnapshotUnavailablePage from "../components/share/ShareSnapshotUnavailablePage";
import { getShareSnapshotPage } from "../features/share-snapshots/share-snapshot.functions";
import {
	getShareSnapshotHeaders,
	SHARE_SNAPSHOT_NOT_FOUND_HEADERS,
} from "../features/share-snapshots/share-snapshot-cache";
import { seo } from "../lib/seo";

const SITE_URL = "https://software.human-tokens.dev";

export const Route = createFileRoute("/share/$shareId")({
	loader: async ({ params }) => {
		const snapshot = await getShareSnapshotPage({
			data: { shareId: params.shareId },
		});

		if (!snapshot) {
			throw notFound({ headers: SHARE_SNAPSHOT_NOT_FOUND_HEADERS });
		}

		return snapshot;
	},
	headers: ({ loaderData }) =>
		loaderData
			? getShareSnapshotHeaders(loaderData.shareId)
			: SHARE_SNAPSHOT_NOT_FOUND_HEADERS,
	head: ({ loaderData }) => {
		if (!loaderData) {
			return {
				meta: [
					{ title: "Shared reading unavailable | Human Tokens" },
					{ name: "robots", content: "noindex, nofollow" },
				],
			};
		}

		return {
			meta: [
				{ name: "robots", content: "noindex, nofollow" },
				...seo({
					title: `${loaderData.title} | Human Tokens`,
					description: loaderData.summary,
					url: `/share/${loaderData.shareId}`,
					siteUrl: SITE_URL,
					type: "article",
				}),
			],
		};
	},
	component: ShareRoute,
	notFoundComponent: ShareSnapshotUnavailablePage,
});

function ShareRoute() {
	const snapshot = Route.useLoaderData();

	return <ShareSnapshotPage snapshot={snapshot} />;
}
