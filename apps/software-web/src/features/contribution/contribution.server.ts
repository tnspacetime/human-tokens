import { env } from "cloudflare:workers";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "../../db/schema";
import { authoringLinks, interviews } from "../../db/schema";
import {
	assertInterviewMarkdownPublishable,
	parseInterviewMarkdownBlocks,
} from "../interviews/interview-markdown";
import { synchronizePublishedContentAfterCommit } from "../publications/publication-cache.server";
import {
	CONTRIBUTION_TOKEN_PATTERN,
	normalizeContributionLinkId,
} from "./contribution-identifiers";

const CONTRIBUTION_AUTHORING_COOKIE_PREFIX = "__Host-contribution-authoring-";
const POSTGRES_REVISION_FORMAT = 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"';

export type ContributionWorkspace = {
	title: string;
	summary: string;
	contentMarkdown: string;
	portraitImageUrl: string | null;
	revision: string;
	submittedAt: string | null;
};

export type ContributionLinkAccess = {
	linkId: string;
	expiresAt: Date;
};

export type ContributionWorkspaceAccess = {
	linkId: string;
	workspace: ContributionWorkspace;
};

export type SaveContributionResult =
	| { status: "saved"; revision: string; submittedAt: string | null }
	| { status: "conflict" | "invalid" | "unavailable" };

export type SaveContributionIntent = "save" | "submit";

export function getContributionAuthoringCookieName(linkId: string) {
	const normalizedLinkId = normalizeContributionLinkId(linkId);

	if (!normalizedLinkId) {
		throw new Error("The contribution link ID is invalid.");
	}

	return `${CONTRIBUTION_AUTHORING_COOKIE_PREFIX}${normalizedLinkId}`;
}

export function serializeContributionAuthoringCookie({
	linkId,
	rawToken,
	maxAge,
}: {
	linkId: string;
	rawToken: string;
	maxAge: number;
}) {
	return `${getContributionAuthoringCookieName(linkId)}=${rawToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${Math.max(0, Math.floor(maxAge))}`;
}

export async function hashContributionToken(rawToken: string) {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(rawToken),
	);

	return Buffer.from(digest);
}

async function createContributionAccessCredential(
	rawToken: string,
	expectedLinkId?: string,
): Promise<{ linkId: string | null; tokenHash: Buffer } | null> {
	if (!CONTRIBUTION_TOKEN_PATTERN.test(rawToken)) {
		return null;
	}

	const normalizedLinkId = expectedLinkId
		? normalizeContributionLinkId(expectedLinkId)
		: null;

	if (expectedLinkId && !normalizedLinkId) {
		return null;
	}

	return {
		linkId: normalizedLinkId,
		tokenHash: await hashContributionToken(rawToken),
	};
}

function getContributionAccessFilter({
	linkId,
	tokenHash,
}: {
	linkId: string | null;
	tokenHash: Buffer;
}) {
	return and(
		eq(authoringLinks.tokenHash, tokenHash),
		linkId ? eq(authoringLinks.id, linkId) : undefined,
		eq(authoringLinks.scope, "guest"),
		isNull(authoringLinks.revokedAt),
		gt(authoringLinks.expiresAt, new Date()),
	);
}

function isContributionInterviewAvailable(status: string) {
	return status === "draft" || status === "ready" || status === "published";
}

export async function resolveContributionLinkAccess(
	rawToken: string,
	expectedLinkId?: string,
): Promise<ContributionLinkAccess | null> {
	const credential = await createContributionAccessCredential(
		rawToken,
		expectedLinkId,
	);

	if (!credential) {
		return null;
	}

	const client = new Client({ connectionString: env.DATABASE_URL });
	await client.connect();

	try {
		const requestDb = drizzle(client, { schema });
		const [row] = await requestDb
			.select({
				linkId: authoringLinks.id,
				expiresAt: authoringLinks.expiresAt,
				status: interviews.status,
			})
			.from(authoringLinks)
			.innerJoin(interviews, eq(authoringLinks.interviewId, interviews.id))
			.where(getContributionAccessFilter(credential))
			.limit(1);

		if (!row || !isContributionInterviewAvailable(row.status)) {
			return null;
		}

		return {
			linkId: row.linkId,
			expiresAt: row.expiresAt,
		};
	} finally {
		await client.end();
	}
}

export async function loadContributionWorkspace(
	rawToken: string,
	expectedLinkId: string,
): Promise<ContributionWorkspaceAccess | null> {
	const credential = await createContributionAccessCredential(
		rawToken,
		expectedLinkId,
	);

	if (!credential) {
		return null;
	}

	const client = new Client({ connectionString: env.DATABASE_URL });
	await client.connect();

	try {
		const requestDb = drizzle(client, { schema });
		const [row] = await requestDb
			.select({
				linkId: authoringLinks.id,
				portraitImageId: interviews.portraitImageId,
				submittedAt: sql<
					string | null
				>`to_char(${authoringLinks.submittedAt} AT TIME ZONE 'UTC', ${POSTGRES_REVISION_FORMAT})`,
				title: interviews.title,
				summary: interviews.summary,
				contentMarkdown: interviews.contentMarkdown,
				status: interviews.status,
				revision: sql<string>`to_char(${interviews.contentUpdatedAt} AT TIME ZONE 'UTC', ${POSTGRES_REVISION_FORMAT})`,
			})
			.from(authoringLinks)
			.innerJoin(interviews, eq(authoringLinks.interviewId, interviews.id))
			.where(getContributionAccessFilter(credential))
			.limit(1);

		if (!row || !isContributionInterviewAvailable(row.status)) {
			return null;
		}

		return {
			linkId: row.linkId,
			workspace: {
				title: row.title,
				summary: row.summary,
				contentMarkdown: row.contentMarkdown,
				portraitImageUrl: row.portraitImageId
					? `/api/v1/contribution/${row.linkId}/portrait-image`
					: null,
				revision: row.revision,
				submittedAt: row.submittedAt,
			},
		};
	} finally {
		await client.end();
	}
}

function getQuestionSignature(markdown: string) {
	return parseInterviewMarkdownBlocks(markdown)
		.filter((block) => block.type === "question")
		.map(({ id, markdown: questionMarkdown }) => ({
			id,
			markdown: questionMarkdown,
		}));
}

function questionsAreUnchanged(
	authoritativeMarkdown: string,
	contributionMarkdown: string,
) {
	const authoritativeQuestions = getQuestionSignature(authoritativeMarkdown);
	const contributionQuestions = getQuestionSignature(contributionMarkdown);

	return (
		authoritativeQuestions.length > 0 &&
		authoritativeQuestions.length === contributionQuestions.length &&
		authoritativeQuestions.every(
			(question, index) =>
				question.id === contributionQuestions[index]?.id &&
				question.markdown === contributionQuestions[index]?.markdown,
		)
	);
}

export async function saveContribution({
	linkId,
	rawToken,
	contentMarkdown,
	revision,
	intent,
}: {
	linkId: string;
	rawToken: string;
	contentMarkdown: string;
	revision: string;
	intent: SaveContributionIntent;
}): Promise<SaveContributionResult> {
	const normalizedLinkId = normalizeContributionLinkId(linkId);

	if (!normalizedLinkId || !CONTRIBUTION_TOKEN_PATTERN.test(rawToken)) {
		return { status: "unavailable" };
	}

	const tokenHash = await hashContributionToken(rawToken);
	const client = new Client({ connectionString: env.DATABASE_URL });
	await client.connect();

	try {
		const requestDb = drizzle(client, { schema });
		const result = await requestDb.transaction(async (transaction) => {
			const [link] = await transaction
				.select({
					id: authoringLinks.id,
					interviewId: authoringLinks.interviewId,
					submittedAt: sql<
						string | null
					>`to_char(${authoringLinks.submittedAt} AT TIME ZONE 'UTC', ${POSTGRES_REVISION_FORMAT})`,
				})
				.from(authoringLinks)
				.where(
					and(
						eq(authoringLinks.id, normalizedLinkId),
						eq(authoringLinks.tokenHash, tokenHash),
						eq(authoringLinks.scope, "guest"),
						isNull(authoringLinks.revokedAt),
						gt(authoringLinks.expiresAt, new Date()),
					),
				)
				.limit(1)
				.for("update");

			if (!link?.interviewId) {
				return { status: "unavailable" } as const;
			}

			const [interview] = await transaction
				.select({
					publicId: interviews.publicId,
					status: interviews.status,
					contentMarkdown: interviews.contentMarkdown,
					revision: sql<string>`to_char(${interviews.contentUpdatedAt} AT TIME ZONE 'UTC', ${POSTGRES_REVISION_FORMAT})`,
				})
				.from(interviews)
				.where(eq(interviews.id, link.interviewId))
				.limit(1)
				.for("update");

			if (
				!interview ||
				(interview.status !== "draft" &&
					interview.status !== "ready" &&
					interview.status !== "published")
			) {
				return { status: "unavailable" } as const;
			}

			if (interview.revision !== revision) {
				return { status: "conflict" } as const;
			}

			try {
				if (
					!questionsAreUnchanged(interview.contentMarkdown, contentMarkdown)
				) {
					return { status: "invalid" } as const;
				}
			} catch {
				return { status: "invalid" } as const;
			}

			if (interview.status === "published") {
				try {
					assertInterviewMarkdownPublishable(contentMarkdown);
				} catch {
					return { status: "invalid" } as const;
				}
			}

			const [updated] = await transaction
				.update(interviews)
				.set({
					contentMarkdown,
					updatedAt: sql`clock_timestamp()`,
					contentUpdatedAt: sql`clock_timestamp()`,
				})
				.where(eq(interviews.id, link.interviewId))
				.returning({
					revision: sql<string>`to_char(${interviews.contentUpdatedAt} AT TIME ZONE 'UTC', ${POSTGRES_REVISION_FORMAT})`,
				});

			if (!updated) {
				return { status: "unavailable" } as const;
			}

			let submittedAt = link.submittedAt;

			if (intent === "submit") {
				const [submitted] = await transaction
					.update(authoringLinks)
					.set({ submittedAt: sql`clock_timestamp()` })
					.where(eq(authoringLinks.id, link.id))
					.returning({
						submittedAt: sql<string>`to_char(${authoringLinks.submittedAt} AT TIME ZONE 'UTC', ${POSTGRES_REVISION_FORMAT})`,
					});

				if (!submitted) {
					return { status: "unavailable" } as const;
				}

				submittedAt = submitted.submittedAt;
			}

			return {
				status: "saved" as const,
				revision: updated.revision,
				submittedAt,
				interviewStatus: interview.status,
				publicId: interview.publicId,
			};
		});

		if (result.status !== "saved") {
			return result;
		}

		if (result.interviewStatus === "published") {
			await synchronizePublishedContentAfterCommit({
				publicIds: [result.publicId],
				failureMessage:
					"Synchronizing caches after a published guest edit failed.",
			});
		}

		return {
			status: "saved",
			revision: result.revision,
			submittedAt: result.submittedAt,
		};
	} finally {
		await client.end();
	}
}
