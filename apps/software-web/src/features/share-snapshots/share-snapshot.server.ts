import { env } from "cloudflare:workers";
import { and, eq, isNull, sql } from "drizzle-orm";

import { withRequestDb } from "../../db";
import {
	backgroundReadings,
	guests,
	interviews,
	shareSnapshots,
} from "../../db/schema";
import { assertInterviewMarkdownPublishable } from "../interviews/interview-markdown";
import type {
	ShareSnapshotContent,
	ShareSnapshotKind,
} from "./share-snapshot.types";
import { purgeShareSnapshotCache } from "./share-snapshot-cache.server";

const SNAPSHOT_PORTRAIT_KEY_PREFIX = "share-snapshot-portraits";

export type CreateShareSnapshotInput = {
	kind: ShareSnapshotKind;
	sourceId: string;
};

export type CreateShareSnapshotResult =
	| {
			status: "created";
			snapshotId: string;
			shareId: string;
			kind: ShareSnapshotKind;
			createdAt: Date;
	  }
	| { status: "not_found" }
	| { status: "incomplete" };

export type RevokeShareSnapshotResult =
	| {
			status: "revoked";
			shareId: string;
			revokedAt: Date;
	  }
	| { status: "not_found" };

function createShareId() {
	return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
		"base64url",
	);
}

function contentIsComplete({
	title,
	summary,
	contentMarkdown,
}: {
	title: string;
	summary: string;
	contentMarkdown: string;
}) {
	return Boolean(title.trim() && summary.trim() && contentMarkdown.trim());
}

async function loadShareSnapshotSource({
	kind,
	sourceId,
}: CreateShareSnapshotInput) {
	if (kind === "background_reading") {
		return withRequestDb(async (requestDb) => {
			const [row] = await requestDb
				.select({
					title: backgroundReadings.title,
					summary: backgroundReadings.summary,
					contentMarkdown: backgroundReadings.contentMarkdown,
				})
				.from(backgroundReadings)
				.where(eq(backgroundReadings.id, sourceId))
				.limit(1);

			return row ? { kind, ...row } : null;
		});
	}

	return withRequestDb(async (requestDb) => {
		const [row] = await requestDb
			.select({
				title: interviews.title,
				summary: interviews.summary,
				contentMarkdown: interviews.contentMarkdown,
				guestName: guests.name,
				guestDescription: guests.description,
				portraitImageId: interviews.portraitImageId,
			})
			.from(interviews)
			.leftJoin(guests, eq(interviews.guestId, guests.id))
			.where(eq(interviews.id, sourceId))
			.limit(1);

		return row ? { kind, ...row } : null;
	});
}

async function copyPortraitForSnapshot({
	snapshotId,
	sourcePortraitImageId,
}: {
	snapshotId: string;
	sourcePortraitImageId: string;
}) {
	const source = await env.HUMAN_TOKENS_SOFTWARE_MEDIA.get(
		sourcePortraitImageId,
	);

	if (!source) {
		throw new Error("The interview portrait could not be copied.");
	}

	const portraitImageId = `${SNAPSHOT_PORTRAIT_KEY_PREFIX}/${snapshotId}/${crypto.randomUUID()}`;
	await env.HUMAN_TOKENS_SOFTWARE_MEDIA.put(portraitImageId, source.body, {
		httpMetadata: source.httpMetadata,
		customMetadata: source.customMetadata,
	});

	return portraitImageId;
}

export async function createShareSnapshot(
	input: CreateShareSnapshotInput,
): Promise<CreateShareSnapshotResult> {
	const source = await loadShareSnapshotSource(input);

	if (!source) {
		return { status: "not_found" };
	}

	if (!contentIsComplete(source)) {
		return { status: "incomplete" };
	}

	if (source.kind === "interview") {
		try {
			assertInterviewMarkdownPublishable(source.contentMarkdown);
		} catch {
			return { status: "incomplete" };
		}
	}

	const snapshotId = crypto.randomUUID();
	const shareId = createShareId();
	let portraitImageId: string | null = null;

	if (source.kind === "interview" && source.portraitImageId) {
		portraitImageId = await copyPortraitForSnapshot({
			snapshotId,
			sourcePortraitImageId: source.portraitImageId,
		});
	}

	try {
		const created = await withRequestDb(async (requestDb) => {
			const [row] = await requestDb
				.insert(shareSnapshots)
				.values({
					id: snapshotId,
					shareId,
					kind: source.kind,
					sourceRecordId: input.sourceId,
					title: source.title,
					summary: source.summary,
					contentMarkdown: source.contentMarkdown,
					guestName: source.kind === "interview" ? source.guestName : null,
					guestDescription:
						source.kind === "interview" ? source.guestDescription : null,
					portraitImageId,
				})
				.returning({ createdAt: shareSnapshots.createdAt });

			return row;
		});

		if (!created) {
			throw new Error("PostgreSQL did not return the created share snapshot.");
		}

		return {
			status: "created",
			snapshotId,
			shareId,
			kind: source.kind,
			createdAt: created.createdAt,
		};
	} catch (error) {
		if (portraitImageId) {
			try {
				await env.HUMAN_TOKENS_SOFTWARE_MEDIA.delete(portraitImageId);
			} catch (cleanupError) {
				console.error(
					JSON.stringify({
						message: "Cleaning up an unreferenced snapshot portrait failed.",
						error:
							cleanupError instanceof Error
								? cleanupError.message
								: "Unknown error",
					}),
				);
			}
		}

		throw error;
	}
}

export async function getShareSnapshot(
	shareId: string,
): Promise<ShareSnapshotContent | null> {
	return withRequestDb(async (requestDb) => {
		const [row] = await requestDb
			.select({
				shareId: shareSnapshots.shareId,
				kind: shareSnapshots.kind,
				title: shareSnapshots.title,
				summary: shareSnapshots.summary,
				contentMarkdown: shareSnapshots.contentMarkdown,
				guestName: shareSnapshots.guestName,
				guestDescription: shareSnapshots.guestDescription,
				portraitImageId: shareSnapshots.portraitImageId,
			})
			.from(shareSnapshots)
			.where(
				and(
					eq(shareSnapshots.shareId, shareId),
					isNull(shareSnapshots.revokedAt),
				),
			)
			.limit(1);

		if (!row) {
			return null;
		}

		if (row.kind === "background_reading") {
			return {
				kind: row.kind,
				shareId: row.shareId,
				title: row.title,
				summary: row.summary,
				contentMarkdown: row.contentMarkdown,
			};
		}

		return {
			kind: row.kind,
			shareId: row.shareId,
			title: row.title,
			summary: row.summary,
			contentMarkdown: row.contentMarkdown,
			guestName: row.guestName,
			guestDescription: row.guestDescription,
			portraitUrl: row.portraitImageId
				? `/share/${row.shareId}/portrait`
				: null,
		};
	});
}

export async function readShareSnapshotPortrait(shareId: string) {
	const portraitImageId = await withRequestDb(async (requestDb) => {
		const [row] = await requestDb
			.select({ portraitImageId: shareSnapshots.portraitImageId })
			.from(shareSnapshots)
			.where(
				and(
					eq(shareSnapshots.shareId, shareId),
					eq(shareSnapshots.kind, "interview"),
					isNull(shareSnapshots.revokedAt),
				),
			)
			.limit(1);

		return row?.portraitImageId ?? null;
	});

	return portraitImageId
		? env.HUMAN_TOKENS_SOFTWARE_MEDIA.get(portraitImageId)
		: null;
}

export async function revokeShareSnapshot(
	snapshotId: string,
): Promise<RevokeShareSnapshotResult> {
	const snapshot = await withRequestDb(async (requestDb) => {
		const [row] = await requestDb
			.update(shareSnapshots)
			.set({
				revokedAt: sql`coalesce(${shareSnapshots.revokedAt}, clock_timestamp())`,
			})
			.where(eq(shareSnapshots.id, snapshotId))
			.returning({
				shareId: shareSnapshots.shareId,
				portraitImageId: shareSnapshots.portraitImageId,
				revokedAt: shareSnapshots.revokedAt,
			});

		return row;
	});

	if (!snapshot?.revokedAt) {
		return { status: "not_found" };
	}

	await purgeShareSnapshotCache(snapshot.shareId);

	if (snapshot.portraitImageId) {
		try {
			await env.HUMAN_TOKENS_SOFTWARE_MEDIA.delete(snapshot.portraitImageId);
		} catch (error) {
			console.error(
				JSON.stringify({
					message: "Deleting a revoked snapshot portrait failed.",
					snapshotId,
					error: error instanceof Error ? error.message : "Unknown error",
				}),
			);
		}
	}

	return {
		status: "revoked",
		shareId: snapshot.shareId,
		revokedAt: snapshot.revokedAt,
	};
}
