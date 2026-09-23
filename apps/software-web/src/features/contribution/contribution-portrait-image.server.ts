import { env } from "cloudflare:workers";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "../../db/schema";
import { authoringLinks, interviews } from "../../db/schema";
import { synchronizePublishedContentAfterCommit } from "../publications/publication-cache.server";
import { hashContributionToken } from "./contribution.server";
import {
	CONTRIBUTION_TOKEN_PATTERN,
	normalizeContributionLinkId,
} from "./contribution-identifiers";

const PORTRAIT_IMAGE_KEY_PREFIX = "interview-portraits";

type PortraitImageAccess = {
	linkId: string;
	interviewId: string;
	portraitImageId: string | null;
};

type ContributionPortraitImageReadResult =
	| { status: "available"; object: R2ObjectBody }
	| { status: "missing" }
	| { status: "unavailable" };

type ContributionPortraitImageWriteResult =
	| { status: "stored"; etag: string }
	| { status: "unavailable" };

function interviewAllowsContribution(status: string) {
	return status === "draft" || status === "ready" || status === "published";
}

async function resolvePortraitImageAccess({
	linkId,
	rawToken,
}: {
	linkId: string;
	rawToken: string;
}): Promise<PortraitImageAccess | null> {
	const normalizedLinkId = normalizeContributionLinkId(linkId);

	if (!normalizedLinkId || !CONTRIBUTION_TOKEN_PATTERN.test(rawToken)) {
		return null;
	}

	const tokenHash = await hashContributionToken(rawToken);
	const client = new Client({ connectionString: env.DATABASE_URL });
	await client.connect();

	try {
		const requestDb = drizzle(client, { schema });
		const [row] = await requestDb
			.select({
				linkId: authoringLinks.id,
				interviewId: interviews.id,
				portraitImageId: interviews.portraitImageId,
				interviewStatus: interviews.status,
			})
			.from(authoringLinks)
			.innerJoin(interviews, eq(authoringLinks.interviewId, interviews.id))
			.where(
				and(
					eq(authoringLinks.id, normalizedLinkId),
					eq(authoringLinks.tokenHash, tokenHash),
					eq(authoringLinks.scope, "guest"),
					isNull(authoringLinks.revokedAt),
					gt(authoringLinks.expiresAt, new Date()),
				),
			)
			.limit(1);

		if (!row || !interviewAllowsContribution(row.interviewStatus)) {
			return null;
		}

		return {
			linkId: row.linkId,
			interviewId: row.interviewId,
			portraitImageId: row.portraitImageId,
		};
	} finally {
		await client.end();
	}
}

export async function readContributionPortraitImage({
	linkId,
	rawToken,
}: {
	linkId: string;
	rawToken: string;
}): Promise<ContributionPortraitImageReadResult> {
	const access = await resolvePortraitImageAccess({ linkId, rawToken });

	if (!access) {
		return { status: "unavailable" };
	}

	if (!access.portraitImageId) {
		return { status: "missing" };
	}

	const object = await env.HUMAN_TOKENS_SOFTWARE_MEDIA.get(
		access.portraitImageId,
	);

	return object ? { status: "available", object } : { status: "missing" };
}

export async function storeContributionPortraitImage({
	linkId,
	rawToken,
	contentType,
	data,
}: {
	linkId: string;
	rawToken: string;
	contentType: string;
	data: ArrayBuffer;
}): Promise<ContributionPortraitImageWriteResult> {
	const access = await resolvePortraitImageAccess({ linkId, rawToken });

	if (!access) {
		return { status: "unavailable" };
	}

	const tokenHash = await hashContributionToken(rawToken);
	const portraitImageId = `${PORTRAIT_IMAGE_KEY_PREFIX}/${access.interviewId}/${crypto.randomUUID()}`;
	const storedObject = await env.HUMAN_TOKENS_SOFTWARE_MEDIA.put(
		portraitImageId,
		data,
		{
			httpMetadata: {
				cacheControl: "private, no-store",
				contentDisposition: "inline",
				contentType,
			},
		},
	);

	if (!storedObject) {
		throw new Error("R2 did not return the stored interview portrait.");
	}

	const client = new Client({ connectionString: env.DATABASE_URL });
	let clientIsConnected = false;
	let databaseReferencesPortrait = false;

	try {
		await client.connect();
		clientIsConnected = true;
		const requestDb = drizzle(client, { schema });
		const updateResult = await requestDb.transaction(async (transaction) => {
			const [link] = await transaction
				.select({
					interviewId: authoringLinks.interviewId,
				})
				.from(authoringLinks)
				.where(
					and(
						eq(authoringLinks.id, access.linkId),
						eq(authoringLinks.tokenHash, tokenHash),
						eq(authoringLinks.scope, "guest"),
						isNull(authoringLinks.revokedAt),
						gt(authoringLinks.expiresAt, new Date()),
					),
				)
				.limit(1)
				.for("update");

			if (!link?.interviewId) {
				return null;
			}

			const [interview] = await transaction
				.select({
					publicId: interviews.publicId,
					status: interviews.status,
					portraitImageId: interviews.portraitImageId,
				})
				.from(interviews)
				.where(eq(interviews.id, link.interviewId))
				.limit(1)
				.for("update");

			if (!interview || !interviewAllowsContribution(interview.status)) {
				return null;
			}

			const [updated] = await transaction
				.update(interviews)
				.set({
					portraitImageId,
					updatedAt: sql`clock_timestamp()`,
				})
				.where(eq(interviews.id, link.interviewId))
				.returning({ id: interviews.id });

			if (!updated) {
				return null;
			}

			const previousPortraitIsReferenced = interview.portraitImageId
				? Boolean(
						(
							await transaction
								.select({ id: interviews.id })
								.from(interviews)
								.where(
									eq(interviews.portraitImageId, interview.portraitImageId),
								)
								.limit(1)
						)[0],
					)
				: false;

			return {
				interviewStatus: interview.status,
				publicId: interview.publicId,
				previousPortraitImageId: interview.portraitImageId,
				previousPortraitIsReferenced,
			};
		});

		if (!updateResult) {
			await env.HUMAN_TOKENS_SOFTWARE_MEDIA.delete(portraitImageId);
			return { status: "unavailable" };
		}

		databaseReferencesPortrait = true;

		if (
			updateResult.previousPortraitImageId &&
			updateResult.previousPortraitImageId !== portraitImageId &&
			!updateResult.previousPortraitIsReferenced
		) {
			try {
				await env.HUMAN_TOKENS_SOFTWARE_MEDIA.delete(
					updateResult.previousPortraitImageId,
				);
			} catch (error) {
				console.error(
					JSON.stringify({
						message: "Deleting the replaced interview portrait failed.",
						error: error instanceof Error ? error.message : "Unknown error",
					}),
				);
			}
		}

		if (updateResult.interviewStatus === "published") {
			await synchronizePublishedContentAfterCommit({
				publicIds: [updateResult.publicId],
				failureMessage:
					"Synchronizing caches after an interview portrait upload failed.",
			});
		}

		return { status: "stored", etag: storedObject.httpEtag };
	} catch (error) {
		if (!databaseReferencesPortrait) {
			try {
				await env.HUMAN_TOKENS_SOFTWARE_MEDIA.delete(portraitImageId);
			} catch (cleanupError) {
				console.error(
					JSON.stringify({
						message: "Cleaning up a failed interview portrait failed.",
						error:
							cleanupError instanceof Error
								? cleanupError.message
								: "Unknown error",
					}),
				);
			}
		}

		throw error;
	} finally {
		if (clientIsConnected) {
			await client.end();
		}
	}
}
