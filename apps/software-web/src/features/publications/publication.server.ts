import { env, waitUntil } from "cloudflare:workers";
import { and, eq, isNotNull } from "drizzle-orm";

import { withRequestDb } from "../../db";
import { backgroundReadings, guests, interviews } from "../../db/schema";
import {
	assertInterviewMarkdownPublishable,
	toPublicInterviewMarkdown,
} from "../interviews/interview-markdown";
import { getPublicInterviewPortraitUrl } from "../interviews/interview-public";
import type {
	PublicLatestResponse,
	PublicPublication,
	PublicPublicationResponse,
} from "./publication.types";
import {
	getPublicationPublishCachePurge,
	PUBLISHED_HOMEPAGE_CACHE_HEADERS,
} from "./publication-cache";
import { purgePublishedContentCache } from "./publication-cache.server";
import { normalizePublicPublication } from "./publication-contract";
import { runPostCommitPublicationSync } from "./publication-sync";

export const PUBLIC_LATEST_RESPONSE_HEADERS = {
	...PUBLISHED_HOMEPAGE_CACHE_HEADERS,
	"X-Robots-Tag": "noindex",
} as const;

export const SOFTWARE_LATEST_KV_KEY = "latest:v1";

export type PublishPublicationInput = {
	interviewId: string;
	backgroundReadingId: string;
};

export type PublishPublicationResult =
	| { status: "published"; response: PublicLatestResponse }
	| { status: "not_found" }
	| { status: "not_ready" }
	| { status: "incomplete" };

function toPublicPublication(
	publication: PublicPublication,
): PublicPublication {
	return normalizePublicPublication({
		...publication,
		interview: {
			...publication.interview,
			contentMarkdown: toPublicInterviewMarkdown(
				publication.interview.contentMarkdown,
			),
		},
	});
}

export async function getLatestPublication(): Promise<PublicLatestResponse> {
	const response =
		(await env.HUMAN_TOKENS_SOFTWARE_LATEST.get<PublicLatestResponse>(
			SOFTWARE_LATEST_KV_KEY,
			"json",
		)) ?? {
			version: "1",
			item: null,
		};

	if (!response.item) {
		return response;
	}

	return {
		...response,
		item: normalizePublicPublication(response.item),
	};
}

export async function getPublication(
	publicId: string,
): Promise<PublicPublicationResponse | null> {
	return withRequestDb(async (requestDb) => {
		const [row] = await requestDb
			.select({
				publicId: interviews.publicId,
				publicationDate: interviews.publicationDate,
				guestId: guests.id,
				guestName: guests.name,
				guestDescription: guests.description,
				interviewTitle: interviews.title,
				interviewSummary: interviews.summary,
				interviewContentMarkdown: interviews.contentMarkdown,
				portraitImageId: interviews.portraitImageId,
				backgroundReadingTitle: backgroundReadings.title,
				backgroundReadingSummary: backgroundReadings.summary,
				backgroundReadingContentMarkdown: backgroundReadings.contentMarkdown,
			})
			.from(interviews)
			.innerJoin(guests, eq(interviews.guestId, guests.id))
			.innerJoin(
				backgroundReadings,
				eq(interviews.backgroundReadingId, backgroundReadings.id),
			)
			.where(
				and(
					eq(interviews.publicId, publicId),
					eq(interviews.status, "published"),
					isNotNull(interviews.publicationDate),
					eq(backgroundReadings.status, "published"),
					isNotNull(backgroundReadings.publicationDate),
				),
			)
			.limit(1);

		if (!row?.publicationDate) {
			return null;
		}

		return {
			version: "1",
			item: {
				publicId: row.publicId,
				publicationDate: row.publicationDate,
				guest: {
					id: row.guestId,
					name: row.guestName,
					description: row.guestDescription,
				},
				interview: {
					title: row.interviewTitle,
					summary: row.interviewSummary,
					contentMarkdown: toPublicInterviewMarkdown(
						row.interviewContentMarkdown,
					),
					portraitUrl: row.portraitImageId
						? getPublicInterviewPortraitUrl(row.publicId)
						: null,
				},
				backgroundReading: {
					title: row.backgroundReadingTitle,
					summary: row.backgroundReadingSummary,
					contentMarkdown: row.backgroundReadingContentMarkdown,
				},
			},
		};
	});
}

export async function publishPublication({
	interviewId,
	backgroundReadingId,
}: PublishPublicationInput): Promise<PublishPublicationResult> {
	const publishedAt = new Date();
	const publicationDate = publishedAt.toISOString().slice(0, 10);
	const item = await withRequestDb((requestDb) =>
		requestDb.transaction(async (transaction) => {
			const rows = await transaction
				.select({
					publicId: interviews.publicId,
					guestId: guests.id,
					guestName: guests.name,
					guestDescription: guests.description,
					interviewTitle: interviews.title,
					interviewSummary: interviews.summary,
					interviewContentMarkdown: interviews.contentMarkdown,
					portraitImageId: interviews.portraitImageId,
					backgroundReadingTitle: backgroundReadings.title,
					backgroundReadingSummary: backgroundReadings.summary,
					backgroundReadingContentMarkdown: backgroundReadings.contentMarkdown,
					interviewStatus: interviews.status,
					backgroundReadingStatus: backgroundReadings.status,
					linkedBackgroundReadingId: interviews.backgroundReadingId,
					interviewPublicationDate: interviews.publicationDate,
				})
				.from(interviews)
				.innerJoin(guests, eq(interviews.guestId, guests.id))
				.innerJoin(
					backgroundReadings,
					eq(backgroundReadings.id, backgroundReadingId),
				)
				.where(eq(interviews.id, interviewId))
				.limit(1)
				.for("update");
			const row = rows[0];

			if (!row) {
				return { status: "not_found" } as const;
			}

			const isReadyToPublish =
				row.interviewStatus === "ready" &&
				row.backgroundReadingStatus === "ready";
			const isPublishedPublication =
				row.interviewStatus === "published" &&
				row.backgroundReadingStatus === "published" &&
				row.linkedBackgroundReadingId === backgroundReadingId;

			if (!isReadyToPublish && !isPublishedPublication) {
				return { status: "not_ready" } as const;
			}

			let resolvedPublicationDate = publicationDate;

			if (isPublishedPublication) {
				if (!row.interviewPublicationDate) {
					return { status: "incomplete" } as const;
				}

				resolvedPublicationDate = row.interviewPublicationDate;
			}

			if (
				!row.interviewTitle.trim() ||
				!row.interviewSummary.trim() ||
				!row.interviewContentMarkdown.trim() ||
				!row.backgroundReadingTitle.trim() ||
				!row.backgroundReadingSummary.trim() ||
				!row.backgroundReadingContentMarkdown.trim()
			) {
				return { status: "incomplete" } as const;
			}

			try {
				assertInterviewMarkdownPublishable(row.interviewContentMarkdown);
			} catch {
				return { status: "incomplete" } as const;
			}

			if (isReadyToPublish) {
				await transaction
					.update(backgroundReadings)
					.set({
						status: "published",
						publicationDate,
						updatedAt: publishedAt,
					})
					.where(eq(backgroundReadings.id, backgroundReadingId));

				await transaction
					.update(interviews)
					.set({
						backgroundReadingId,
						status: "published",
						publicationDate,
						updatedAt: publishedAt,
						contentUpdatedAt: publishedAt,
					})
					.where(eq(interviews.id, interviewId));
			}

			return {
				status: "published",
				item: toPublicPublication({
					publicId: row.publicId,
					publicationDate: resolvedPublicationDate,
					guest: {
						id: row.guestId,
						name: row.guestName,
						description: row.guestDescription,
					},
					interview: {
						title: row.interviewTitle,
						summary: row.interviewSummary,
						contentMarkdown: row.interviewContentMarkdown,
						portraitUrl: row.portraitImageId
							? getPublicInterviewPortraitUrl(row.publicId)
							: null,
					},
					backgroundReading: {
						title: row.backgroundReadingTitle,
						summary: row.backgroundReadingSummary,
						contentMarkdown: row.backgroundReadingContentMarkdown,
					},
				}),
			} as const;
		}),
	);

	if (item.status !== "published") {
		return item;
	}

	const response = {
		version: "1",
		item: item.item,
	} satisfies PublicLatestResponse;

	await runPostCommitPublicationSync({
		operation: async () => {
			await env.HUMAN_TOKENS_SOFTWARE_LATEST.put(
				SOFTWARE_LATEST_KV_KEY,
				JSON.stringify(response),
			);
			await purgePublishedContentCache(
				getPublicationPublishCachePurge(item.item.guest.id),
			);
		},
		schedule: waitUntil,
		onFailure: (error) => {
			console.error(
				JSON.stringify({
					message: "Published content cache synchronization failed.",
					publicId: item.item.publicId,
					error: error instanceof Error ? error.message : "Unknown error",
				}),
			);
		},
	});

	return { status: "published", response };
}
