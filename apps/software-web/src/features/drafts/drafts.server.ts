import { env } from "cloudflare:workers";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { alias } from "drizzle-orm/pg-core";
import { Client } from "pg";
import { withRequestDb } from "../../db";
import * as schema from "../../db/schema";
import {
	authoringLinks,
	backgroundReadings,
	interviews,
} from "../../db/schema";
import {
	assertInterviewMarkdownPublishable,
	parseInterviewMarkdownBlocks,
} from "../interviews/interview-markdown";
import { synchronizePublishedContentAfterCommit } from "../publications/publication-cache.server";
import { DRAFT_TOKEN_PATTERN, normalizeDraftLinkId } from "./draft-identifiers";

const DRAFT_AUTHORING_COOKIE_PREFIX = "__Host-draft-authoring-";
const POSTGRES_REVISION_FORMAT = 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"';
const guestAuthoringLinks = alias(authoringLinks, "guest_authoring_links");

export const DRAFT_KINDS = ["interview", "background_reading"] as const;

export type DraftKind = (typeof DRAFT_KINDS)[number];
export type DraftStatus = "draft" | "ready" | "published";
export type DraftSaveIntent = "save" | "finalize" | "unfinalize";

export function isDraftKind(value: unknown): value is DraftKind {
	return value === "interview" || value === "background_reading";
}

export type CreateDraftInput = {
	kind: DraftKind;
	expiresInDays: number;
};

type CreatedDraft = {
	rawToken: string;
	expiresAt: Date;
	targetId: string;
};

type DraftWorkspaceContent = {
	status: DraftStatus;
	title: string;
	summary: string;
	contentMarkdown: string;
	revision: string;
};

export type InterviewDraftWorkspace = DraftWorkspaceContent & {
	kind: "interview";
	guestContribution:
		| { status: "awaiting" }
		| { status: "submitted"; submittedAt: string }
		| null;
};

export type BackgroundReadingDraftWorkspace = DraftWorkspaceContent & {
	kind: "background_reading";
};

export type DraftWorkspace =
	| InterviewDraftWorkspace
	| BackgroundReadingDraftWorkspace;

export type DraftLinkAccess =
	| {
			kind: "interview";
			linkId: string;
			targetId: string;
			expiresAt: Date;
	  }
	| {
			kind: "background_reading";
			linkId: string;
			targetId: string;
			expiresAt: Date;
	  };

type DraftSaveInput = {
	linkId: string;
	rawToken: string;
	title: string;
	summary: string;
	contentMarkdown: string;
	revision: string;
	intent: DraftSaveIntent;
};

export type SaveInterviewDraftInput = DraftSaveInput;
export type SaveBackgroundReadingDraftInput = DraftSaveInput;

export type SaveDraftResult =
	| {
			status: "saved";
			revision: string;
			draftStatus: DraftStatus;
	  }
	| { status: "conflict" }
	| { status: "invalid" }
	| { status: "unavailable" };

export type CreateInterviewContributionLinkInput = {
	linkId: string;
	rawToken: string;
};

export type CreateInterviewContributionLinkResult =
	| { status: "created"; rawToken: string; expiresAt: Date }
	| { status: "unavailable" };

export function getDraftAuthoringCookieName(linkId: string) {
	const normalizedLinkId = normalizeDraftLinkId(linkId);

	if (!normalizedLinkId) {
		throw new Error("The draft link ID is invalid.");
	}

	return `${DRAFT_AUTHORING_COOKIE_PREFIX}${normalizedLinkId}`;
}

export function serializeDraftAuthoringCookie({
	linkId,
	rawToken,
	maxAge,
}: {
	linkId: string;
	rawToken: string;
	maxAge: number;
}) {
	return `${getDraftAuthoringCookieName(linkId)}=${rawToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${Math.max(0, Math.floor(maxAge))}`;
}

function toBase64Url(bytes: Uint8Array) {
	return Buffer.from(bytes).toString("base64url");
}

function createOpaqueValue(byteLength: number) {
	return toBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

async function hashToken(rawToken: string) {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(rawToken),
	);

	return Buffer.from(digest);
}

function isDraftStatus(value: string): value is DraftStatus {
	return value === "draft" || value === "ready" || value === "published";
}

function getNextDraftStatus(
	status: DraftStatus,
	intent: DraftSaveIntent,
): DraftStatus {
	if (intent === "finalize" && status === "draft") {
		return "ready";
	}

	if (intent === "unfinalize" && status === "ready") {
		return "draft";
	}

	return status;
}

function normalizeDraftCredential(linkId: string, rawToken: string) {
	const normalizedLinkId = normalizeDraftLinkId(linkId);

	if (!normalizedLinkId || !DRAFT_TOKEN_PATTERN.test(rawToken)) {
		return null;
	}

	return { linkId: normalizedLinkId };
}

export async function resolveDraftLink(
	rawToken: string,
	expectedLinkId?: string,
): Promise<DraftLinkAccess | null> {
	if (!DRAFT_TOKEN_PATTERN.test(rawToken)) {
		return null;
	}

	const normalizedLinkId = expectedLinkId
		? normalizeDraftLinkId(expectedLinkId)
		: null;

	if (expectedLinkId && !normalizedLinkId) {
		return null;
	}

	const tokenHash = await hashToken(rawToken);
	const client = new Client({ connectionString: env.DATABASE_URL });
	await client.connect();

	try {
		const requestDb = drizzle(client, { schema });
		const [link] = await requestDb
			.select({
				linkId: authoringLinks.id,
				interviewId: authoringLinks.interviewId,
				backgroundReadingId: authoringLinks.backgroundReadingId,
				expiresAt: authoringLinks.expiresAt,
			})
			.from(authoringLinks)
			.where(
				and(
					eq(authoringLinks.tokenHash, tokenHash),
					normalizedLinkId
						? eq(authoringLinks.id, normalizedLinkId)
						: undefined,
					eq(authoringLinks.scope, "draft"),
					isNull(authoringLinks.revokedAt),
					gt(authoringLinks.expiresAt, new Date()),
				),
			)
			.limit(1);

		if (link?.interviewId) {
			return {
				kind: "interview",
				linkId: link.linkId,
				targetId: link.interviewId,
				expiresAt: link.expiresAt,
			};
		}

		if (link?.backgroundReadingId) {
			return {
				kind: "background_reading",
				linkId: link.linkId,
				targetId: link.backgroundReadingId,
				expiresAt: link.expiresAt,
			};
		}

		return null;
	} finally {
		await client.end();
	}
}

export async function loadDraftWorkspace({
	linkId,
	rawToken,
}: {
	linkId: string;
	rawToken: string;
}): Promise<DraftWorkspace | null> {
	const credential = normalizeDraftCredential(linkId, rawToken);

	if (!credential) {
		return null;
	}

	const tokenHash = await hashToken(rawToken);
	const client = new Client({ connectionString: env.DATABASE_URL });
	await client.connect();

	try {
		const requestDb = drizzle(client, { schema });
		const [row] = await requestDb
			.select({
				interviewId: authoringLinks.interviewId,
				interviewStatus: interviews.status,
				interviewTitle: interviews.title,
				interviewSummary: interviews.summary,
				interviewContentMarkdown: interviews.contentMarkdown,
				interviewRevision: sql<
					string | null
				>`to_char(${interviews.contentUpdatedAt} AT TIME ZONE 'UTC', ${POSTGRES_REVISION_FORMAT})`,
				guestLinkId: guestAuthoringLinks.id,
				guestSubmittedAt: sql<
					string | null
				>`to_char(${guestAuthoringLinks.submittedAt} AT TIME ZONE 'UTC', ${POSTGRES_REVISION_FORMAT})`,
				backgroundReadingId: authoringLinks.backgroundReadingId,
				backgroundReadingStatus: backgroundReadings.status,
				backgroundReadingTitle: backgroundReadings.title,
				backgroundReadingSummary: backgroundReadings.summary,
				backgroundReadingContentMarkdown: backgroundReadings.contentMarkdown,
				backgroundReadingRevision: sql<
					string | null
				>`to_char(${backgroundReadings.updatedAt} AT TIME ZONE 'UTC', ${POSTGRES_REVISION_FORMAT})`,
			})
			.from(authoringLinks)
			.leftJoin(interviews, eq(authoringLinks.interviewId, interviews.id))
			.leftJoin(
				backgroundReadings,
				eq(authoringLinks.backgroundReadingId, backgroundReadings.id),
			)
			.leftJoin(
				guestAuthoringLinks,
				and(
					eq(guestAuthoringLinks.interviewId, interviews.id),
					eq(guestAuthoringLinks.scope, "guest"),
					isNull(guestAuthoringLinks.revokedAt),
				),
			)
			.where(
				and(
					eq(authoringLinks.id, credential.linkId),
					eq(authoringLinks.tokenHash, tokenHash),
					eq(authoringLinks.scope, "draft"),
					isNull(authoringLinks.revokedAt),
					gt(authoringLinks.expiresAt, new Date()),
				),
			)
			.limit(1);

		if (!row) {
			return null;
		}

		if (
			row.interviewId &&
			row.interviewStatus !== null &&
			isDraftStatus(row.interviewStatus) &&
			row.interviewTitle !== null &&
			row.interviewSummary !== null &&
			row.interviewContentMarkdown !== null &&
			row.interviewRevision !== null
		) {
			return {
				kind: "interview",
				status: row.interviewStatus,
				title: row.interviewTitle,
				summary: row.interviewSummary,
				contentMarkdown: row.interviewContentMarkdown,
				revision: row.interviewRevision,
				guestContribution: row.guestLinkId
					? row.guestSubmittedAt
						? { status: "submitted", submittedAt: row.guestSubmittedAt }
						: { status: "awaiting" }
					: null,
			};
		}

		if (
			row.backgroundReadingId &&
			row.backgroundReadingStatus !== null &&
			isDraftStatus(row.backgroundReadingStatus) &&
			row.backgroundReadingTitle !== null &&
			row.backgroundReadingSummary !== null &&
			row.backgroundReadingContentMarkdown !== null &&
			row.backgroundReadingRevision !== null
		) {
			return {
				kind: "background_reading",
				status: row.backgroundReadingStatus,
				title: row.backgroundReadingTitle,
				summary: row.backgroundReadingSummary,
				contentMarkdown: row.backgroundReadingContentMarkdown,
				revision: row.backgroundReadingRevision,
			};
		}

		return null;
	} finally {
		await client.end();
	}
}

export async function saveInterviewDraft({
	linkId,
	rawToken,
	title,
	summary,
	contentMarkdown,
	revision,
	intent,
}: SaveInterviewDraftInput): Promise<SaveDraftResult> {
	const credential = normalizeDraftCredential(linkId, rawToken);

	if (!credential) {
		return { status: "unavailable" };
	}

	const tokenHash = await hashToken(rawToken);
	const result = await withRequestDb((requestDb) =>
		requestDb.transaction(async (transaction) => {
			const [link] = await transaction
				.select({ interviewId: authoringLinks.interviewId })
				.from(authoringLinks)
				.where(
					and(
						eq(authoringLinks.id, credential.linkId),
						eq(authoringLinks.tokenHash, tokenHash),
						eq(authoringLinks.scope, "draft"),
						isNull(authoringLinks.revokedAt),
						gt(authoringLinks.expiresAt, new Date()),
					),
				)
				.limit(1)
				.for("update");

			if (!link?.interviewId) {
				return { status: "unavailable" } as const;
			}

			const [target] = await transaction
				.select({
					publicId: interviews.publicId,
					guestId: interviews.guestId,
					status: interviews.status,
					revision: sql<string>`to_char(${interviews.contentUpdatedAt} AT TIME ZONE 'UTC', ${POSTGRES_REVISION_FORMAT})`,
				})
				.from(interviews)
				.where(eq(interviews.id, link.interviewId))
				.limit(1)
				.for("update");

			if (!target || !isDraftStatus(target.status)) {
				return { status: "unavailable" } as const;
			}

			if (target.revision !== revision) {
				return { status: "conflict" } as const;
			}

			try {
				if (target.status === "published") {
					assertInterviewMarkdownPublishable(contentMarkdown);
				} else {
					parseInterviewMarkdownBlocks(contentMarkdown);
				}
			} catch {
				return { status: "invalid" } as const;
			}

			const nextStatus = getNextDraftStatus(target.status, intent);
			const [updated] = await transaction
				.update(interviews)
				.set({
					title,
					summary,
					contentMarkdown,
					status: nextStatus,
					updatedAt: sql`clock_timestamp()`,
					contentUpdatedAt: sql`clock_timestamp()`,
				})
				.where(
					and(
						eq(interviews.id, link.interviewId),
						eq(interviews.status, target.status),
					),
				)
				.returning({
					revision: sql<string>`to_char(${interviews.contentUpdatedAt} AT TIME ZONE 'UTC', ${POSTGRES_REVISION_FORMAT})`,
				});

			return updated
				? {
						status: "saved" as const,
						revision: updated.revision,
						draftStatus: nextStatus,
						publicId: target.publicId,
						guestId: target.guestId,
					}
				: { status: "unavailable" as const };
		}),
	);

	if (result.status !== "saved") {
		return result;
	}

	if (result.draftStatus === "published") {
		await synchronizePublishedContentAfterCommit({
			publicIds: [result.publicId],
			guestIds: result.guestId ? [result.guestId] : [],
			failureMessage:
				"Synchronizing caches after a published interview edit failed.",
		});
	}

	return {
		status: "saved",
		revision: result.revision,
		draftStatus: result.draftStatus,
	};
}

export async function saveBackgroundReadingDraft({
	linkId,
	rawToken,
	title,
	summary,
	contentMarkdown,
	revision,
	intent,
}: SaveBackgroundReadingDraftInput): Promise<SaveDraftResult> {
	const credential = normalizeDraftCredential(linkId, rawToken);

	if (!credential) {
		return { status: "unavailable" };
	}

	const tokenHash = await hashToken(rawToken);
	const result = await withRequestDb((requestDb) =>
		requestDb.transaction(async (transaction) => {
			const [link] = await transaction
				.select({
					backgroundReadingId: authoringLinks.backgroundReadingId,
				})
				.from(authoringLinks)
				.where(
					and(
						eq(authoringLinks.id, credential.linkId),
						eq(authoringLinks.tokenHash, tokenHash),
						eq(authoringLinks.scope, "draft"),
						isNull(authoringLinks.revokedAt),
						gt(authoringLinks.expiresAt, new Date()),
					),
				)
				.limit(1)
				.for("update");

			if (!link?.backgroundReadingId) {
				return { status: "unavailable" } as const;
			}

			const [target] = await transaction
				.select({
					status: backgroundReadings.status,
					revision: sql<string>`to_char(${backgroundReadings.updatedAt} AT TIME ZONE 'UTC', ${POSTGRES_REVISION_FORMAT})`,
				})
				.from(backgroundReadings)
				.where(eq(backgroundReadings.id, link.backgroundReadingId))
				.limit(1)
				.for("update");

			if (!target || !isDraftStatus(target.status)) {
				return { status: "unavailable" } as const;
			}

			if (target.revision !== revision) {
				return { status: "conflict" } as const;
			}

			const nextStatus = getNextDraftStatus(target.status, intent);
			const [updated] = await transaction
				.update(backgroundReadings)
				.set({
					title,
					summary,
					contentMarkdown,
					status: nextStatus,
					updatedAt: sql`clock_timestamp()`,
				})
				.where(
					and(
						eq(backgroundReadings.id, link.backgroundReadingId),
						eq(backgroundReadings.status, target.status),
					),
				)
				.returning({
					revision: sql<string>`to_char(${backgroundReadings.updatedAt} AT TIME ZONE 'UTC', ${POSTGRES_REVISION_FORMAT})`,
				});

			if (!updated) {
				return { status: "unavailable" as const };
			}

			const publishedInterviews =
				nextStatus === "published"
					? await transaction
							.select({ publicId: interviews.publicId })
							.from(interviews)
							.where(
								and(
									eq(interviews.backgroundReadingId, link.backgroundReadingId),
									eq(interviews.status, "published"),
								),
							)
					: [];

			return {
				status: "saved" as const,
				revision: updated.revision,
				draftStatus: nextStatus,
				publicIds: publishedInterviews.map((interview) => interview.publicId),
			};
		}),
	);

	if (result.status !== "saved") {
		return result;
	}

	if (result.draftStatus === "published") {
		await synchronizePublishedContentAfterCommit({
			publicIds: result.publicIds,
			failureMessage:
				"Synchronizing caches after a published background-reading edit failed.",
		});
	}

	return {
		status: "saved",
		revision: result.revision,
		draftStatus: result.draftStatus,
	};
}

export async function createInterviewContributionLink({
	linkId,
	rawToken,
}: CreateInterviewContributionLinkInput): Promise<CreateInterviewContributionLinkResult> {
	const credential = normalizeDraftCredential(linkId, rawToken);

	if (!credential) {
		return { status: "unavailable" };
	}

	const draftTokenHash = await hashToken(rawToken);
	const contributionToken = createOpaqueValue(32);
	const tokenHash = await hashToken(contributionToken);
	const client = new Client({ connectionString: env.DATABASE_URL });
	await client.connect();

	try {
		const requestDb = drizzle(client, { schema });
		const result = await requestDb.transaction(async (transaction) => {
			const [draftLink] = await transaction
				.select({
					interviewId: authoringLinks.interviewId,
					expiresAt: authoringLinks.expiresAt,
				})
				.from(authoringLinks)
				.where(
					and(
						eq(authoringLinks.id, credential.linkId),
						eq(authoringLinks.tokenHash, draftTokenHash),
						eq(authoringLinks.scope, "draft"),
						isNull(authoringLinks.revokedAt),
						gt(authoringLinks.expiresAt, new Date()),
					),
				)
				.limit(1)
				.for("update");

			if (!draftLink?.interviewId) {
				return { status: "unavailable" } as const;
			}

			const [interview] = await transaction
				.select({ status: interviews.status })
				.from(interviews)
				.where(eq(interviews.id, draftLink.interviewId))
				.limit(1)
				.for("update");

			if (!interview || !isDraftStatus(interview.status)) {
				return { status: "unavailable" } as const;
			}

			await transaction
				.update(authoringLinks)
				.set({ revokedAt: sql`clock_timestamp()` })
				.where(
					and(
						eq(authoringLinks.interviewId, draftLink.interviewId),
						eq(authoringLinks.scope, "guest"),
						isNull(authoringLinks.revokedAt),
					),
				);

			await transaction.insert(authoringLinks).values({
				interviewId: draftLink.interviewId,
				scope: "guest",
				tokenHash,
				rawToken: contributionToken,
				expiresAt: draftLink.expiresAt,
			});

			return {
				status: "created",
				rawToken: contributionToken,
				expiresAt: draftLink.expiresAt,
			} as const;
		});

		return result;
	} finally {
		await client.end();
	}
}

export async function createDraft({
	kind,
	expiresInDays,
}: CreateDraftInput): Promise<CreatedDraft> {
	const rawToken = createOpaqueValue(32);
	const tokenHash = await hashToken(rawToken);
	const expiresAt = new Date();
	expiresAt.setUTCDate(expiresAt.getUTCDate() + expiresInDays);
	const client = new Client({ connectionString: env.DATABASE_URL });
	await client.connect();

	try {
		const requestDb = drizzle(client, { schema });

		const targetId = await requestDb.transaction(async (transaction) => {
			if (kind === "interview") {
				const [draft] = await transaction
					.insert(interviews)
					.values({
						guestId: null,
						publicId: createOpaqueValue(16),
						status: "draft",
					})
					.returning({ id: interviews.id });

				if (!draft) {
					throw new Error("The interview draft was not created.");
				}

				await transaction.insert(authoringLinks).values({
					interviewId: draft.id,
					scope: "draft",
					tokenHash,
					rawToken,
					expiresAt,
				});

				return draft.id;
			}

			const [draft] = await transaction
				.insert(backgroundReadings)
				.values({ status: "draft" })
				.returning({ id: backgroundReadings.id });

			if (!draft) {
				throw new Error("The background-reading draft was not created.");
			}

			await transaction.insert(authoringLinks).values({
				backgroundReadingId: draft.id,
				scope: "draft",
				tokenHash,
				rawToken,
				expiresAt,
			});

			return draft.id;
		});

		return { rawToken, expiresAt, targetId };
	} finally {
		await client.end();
	}
}
