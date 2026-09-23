import { cache, env, waitUntil } from "cloudflare:workers";
import { GUEST_LIST_CACHE_TAG, getGuestCacheTag } from "../guests/guests-cache";
import { getPublication } from "./publication.server";
import type { PublicLatestResponse } from "./publication.types";
import {
	getPublishedInterviewCacheTag,
	HOMEPAGE_CACHE_TAG,
} from "./publication-cache";
import { runPostCommitPublicationSync } from "./publication-sync";

const SOFTWARE_LATEST_KV_KEY = "latest:v1";

async function synchronizePublishedContent({
	publicIds,
	guestIds,
	guestList,
}: {
	publicIds: readonly string[];
	guestIds: readonly string[];
	guestList: boolean;
}) {
	const uniquePublicIds = [...new Set(publicIds)];

	await purgePublishedContentCache({
		publicIds: uniquePublicIds,
		guestIds,
		guestList,
	});

	if (uniquePublicIds.length === 0) {
		return;
	}

	const latest =
		await env.HUMAN_TOKENS_SOFTWARE_LATEST.get<PublicLatestResponse>(
			SOFTWARE_LATEST_KV_KEY,
			"json",
		);
	const latestPublicId = latest?.item?.publicId;

	if (!latestPublicId || !uniquePublicIds.includes(latestPublicId)) {
		return;
	}

	const current = await getPublication(latestPublicId);

	if (!current) {
		throw new Error(
			`Published interview ${latestPublicId} could not be rebuilt for cache synchronization.`,
		);
	}

	const latestBeforeWrite =
		await env.HUMAN_TOKENS_SOFTWARE_LATEST.get<PublicLatestResponse>(
			SOFTWARE_LATEST_KV_KEY,
			"json",
		);

	if (latestBeforeWrite?.item?.publicId !== latestPublicId) {
		return;
	}

	await env.HUMAN_TOKENS_SOFTWARE_LATEST.put(
		SOFTWARE_LATEST_KV_KEY,
		JSON.stringify(current),
	);
	await purgePublishedContentCache({ homepage: true });
}

export async function synchronizePublishedContentAfterCommit({
	publicIds,
	guestIds = [],
	guestList = false,
	failureMessage,
}: {
	publicIds: readonly string[];
	guestIds?: readonly string[];
	guestList?: boolean;
	failureMessage: string;
}) {
	await runPostCommitPublicationSync({
		operation: () =>
			synchronizePublishedContent({ publicIds, guestIds, guestList }),
		schedule: waitUntil,
		onFailure: (error) => {
			console.error(
				JSON.stringify({
					message: failureMessage,
					error: error instanceof Error ? error.message : "Unknown error",
				}),
			);
		},
	});
}

export async function purgePublishedContentCache({
	publicIds = [],
	homepage = false,
	guestIds = [],
	guestList = false,
}: {
	publicIds?: readonly string[];
	homepage?: boolean;
	guestIds?: readonly string[];
	guestList?: boolean;
}) {
	const tags = [
		...(homepage ? [HOMEPAGE_CACHE_TAG] : []),
		...(guestList ? [GUEST_LIST_CACHE_TAG] : []),
		...guestIds.map(getGuestCacheTag),
		...publicIds.map(getPublishedInterviewCacheTag),
	];

	if (tags.length === 0) {
		return;
	}

	const result = await cache.purge({ tags: [...new Set(tags)] });

	if (!result.success) {
		throw new Error(
			`Purging published cache tags failed: ${result.errors
				.map((error) => `${error.code}: ${error.message}`)
				.join(", ")}`,
		);
	}
}
