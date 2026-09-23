import { and, asc, desc, eq, gt, ilike, isNull, lt, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { withRequestDb } from "../../db";
import { authoringLinks, guests, interviews } from "../../db/schema";
import { synchronizePublishedContentAfterCommit } from "../publications/publication-cache.server";
import { buildGuestAttachmentInterviewQuery } from "./admin-queries";

export type AdminGuestCursor = {
	name: string;
	id: string;
};

export type AdminInterviewCursor = {
	updatedAt: Date;
	id: string;
};

export type CreateAdminGuestInput = {
	name: string;
	description: string;
};

export type AttachGuestResult =
	| {
			status: "attached";
			item: {
				interviewId: string;
				guest: {
					id: string;
					name: string;
					description: string;
				};
				updatedAt: string;
			};
	  }
	| { status: "interview_not_found" }
	| { status: "guest_not_found" };

const guestAuthoringLinks = alias(
	authoringLinks,
	"admin_guest_authoring_links",
);

export function parseAdminGuestCursor(value: string): AdminGuestCursor | null {
	try {
		const parsed: unknown = JSON.parse(value);

		if (
			!Array.isArray(parsed) ||
			parsed.length !== 2 ||
			typeof parsed[0] !== "string" ||
			typeof parsed[1] !== "string" ||
			parsed[0].length === 0 ||
			parsed[1].length === 0
		) {
			return null;
		}

		return { name: parsed[0], id: parsed[1] };
	} catch {
		return null;
	}
}

function createAdminGuestCursor({ name, id }: AdminGuestCursor) {
	return JSON.stringify([name, id]);
}

export function parseAdminInterviewCursor(
	value: string,
): AdminInterviewCursor | null {
	try {
		const parsed: unknown = JSON.parse(value);

		if (
			!Array.isArray(parsed) ||
			parsed.length !== 2 ||
			typeof parsed[0] !== "string" ||
			typeof parsed[1] !== "string" ||
			parsed[0].length === 0 ||
			parsed[1].length === 0
		) {
			return null;
		}

		const updatedAt = new Date(parsed[0]);

		if (Number.isNaN(updatedAt.getTime())) {
			return null;
		}

		return { updatedAt, id: parsed[1] };
	} catch {
		return null;
	}
}

function createAdminInterviewCursor({ updatedAt, id }: AdminInterviewCursor) {
	return JSON.stringify([updatedAt.toISOString(), id]);
}

function toGuestContribution(linkId: string | null, submittedAt: Date | null) {
	if (!linkId) {
		return null;
	}

	return submittedAt
		? ({ status: "submitted", submittedAt: submittedAt.toISOString() } as const)
		: ({ status: "awaiting" } as const);
}

export async function createAdminGuest(input: CreateAdminGuestInput) {
	return withRequestDb(async (requestDb) => {
		const [guest] = await requestDb.insert(guests).values(input).returning({
			id: guests.id,
			name: guests.name,
			description: guests.description,
		});

		if (!guest) {
			throw new Error("The guest was not created.");
		}

		return guest;
	});
}

export async function listAdminGuests({
	limit,
	query = null,
	cursor = null,
}: {
	limit: number;
	query?: string | null;
	cursor?: AdminGuestCursor | null;
}) {
	const cursorFilter = cursor
		? or(
				gt(guests.name, cursor.name),
				and(eq(guests.name, cursor.name), gt(guests.id, cursor.id)),
			)
		: undefined;
	const queryFilter = query ? ilike(guests.name, `%${query}%`) : undefined;
	return withRequestDb(async (requestDb) => {
		const rows = await requestDb
			.select({
				id: guests.id,
				name: guests.name,
				description: guests.description,
			})
			.from(guests)
			.where(and(queryFilter, cursorFilter))
			.orderBy(asc(guests.name), asc(guests.id))
			.limit(limit + 1);
		const hasNextPage = rows.length > limit;
		const items = rows.slice(0, limit);
		const lastItem = items.at(-1);

		return {
			version: "1" as const,
			items,
			nextCursor:
				hasNextPage && lastItem ? createAdminGuestCursor(lastItem) : null,
		};
	});
}

export async function listAdminInterviews({
	limit,
	query = null,
	cursor = null,
}: {
	limit: number;
	query?: string | null;
	cursor?: AdminInterviewCursor | null;
}) {
	const cursorFilter = cursor
		? or(
				lt(interviews.updatedAt, cursor.updatedAt),
				and(
					eq(interviews.updatedAt, cursor.updatedAt),
					lt(interviews.id, cursor.id),
				),
			)
		: undefined;
	const queryFilter = query
		? or(
				ilike(interviews.title, `%${query}%`),
				ilike(interviews.publicId, `%${query}%`),
			)
		: undefined;
	return withRequestDb(async (requestDb) => {
		const rows = await requestDb
			.select({
				id: interviews.id,
				publicId: interviews.publicId,
				title: interviews.title,
				status: interviews.status,
				updatedAt: interviews.updatedAt,
				guestId: guests.id,
				guestName: guests.name,
				guestLinkId: guestAuthoringLinks.id,
				guestSubmittedAt: guestAuthoringLinks.submittedAt,
			})
			.from(interviews)
			.leftJoin(guests, eq(interviews.guestId, guests.id))
			.leftJoin(
				guestAuthoringLinks,
				and(
					eq(guestAuthoringLinks.interviewId, interviews.id),
					eq(guestAuthoringLinks.scope, "guest"),
					isNull(guestAuthoringLinks.revokedAt),
				),
			)
			.where(and(queryFilter, cursorFilter))
			.orderBy(desc(interviews.updatedAt), desc(interviews.id))
			.limit(limit + 1);
		const hasNextPage = rows.length > limit;
		const items = rows.slice(0, limit).map((row) => ({
			id: row.id,
			publicId: row.publicId,
			title: row.title,
			status: row.status,
			guest:
				row.guestId && row.guestName
					? { id: row.guestId, name: row.guestName }
					: null,
			guestContribution: toGuestContribution(
				row.guestLinkId,
				row.guestSubmittedAt,
			),
			updatedAt: row.updatedAt.toISOString(),
		}));
		const lastRow = rows[Math.min(limit, rows.length) - 1];

		return {
			version: "1" as const,
			items,
			nextCursor:
				hasNextPage && lastRow
					? createAdminInterviewCursor({
							updatedAt: lastRow.updatedAt,
							id: lastRow.id,
						})
					: null,
		};
	});
}

export async function getAdminInterview(interviewId: string) {
	return withRequestDb(async (requestDb) => {
		const [row] = await requestDb
			.select({
				id: interviews.id,
				publicId: interviews.publicId,
				title: interviews.title,
				summary: interviews.summary,
				contentMarkdown: interviews.contentMarkdown,
				portraitImageId: interviews.portraitImageId,
				status: interviews.status,
				backgroundReadingId: interviews.backgroundReadingId,
				publicationDate: interviews.publicationDate,
				createdAt: interviews.createdAt,
				updatedAt: interviews.updatedAt,
				guestId: guests.id,
				guestName: guests.name,
				guestDescription: guests.description,
				guestLinkId: guestAuthoringLinks.id,
				guestSubmittedAt: guestAuthoringLinks.submittedAt,
			})
			.from(interviews)
			.leftJoin(guests, eq(interviews.guestId, guests.id))
			.leftJoin(
				guestAuthoringLinks,
				and(
					eq(guestAuthoringLinks.interviewId, interviews.id),
					eq(guestAuthoringLinks.scope, "guest"),
					isNull(guestAuthoringLinks.revokedAt),
				),
			)
			.where(eq(interviews.id, interviewId))
			.limit(1);

		if (!row) {
			return null;
		}

		return {
			version: "1" as const,
			item: {
				id: row.id,
				publicId: row.publicId,
				title: row.title,
				summary: row.summary,
				contentMarkdown: row.contentMarkdown,
				portraitImageId: row.portraitImageId,
				status: row.status,
				backgroundReadingId: row.backgroundReadingId,
				publicationDate: row.publicationDate,
				guest:
					row.guestId && row.guestName && row.guestDescription
						? {
								id: row.guestId,
								name: row.guestName,
								description: row.guestDescription,
							}
						: null,
				guestContribution: toGuestContribution(
					row.guestLinkId,
					row.guestSubmittedAt,
				),
				createdAt: row.createdAt.toISOString(),
				updatedAt: row.updatedAt.toISOString(),
			},
		};
	});
}

export async function attachGuestToInterview(
	interviewId: string,
	guestId: string,
): Promise<AttachGuestResult> {
	const result = await withRequestDb((requestDb) =>
		requestDb.transaction(async (transaction) => {
			const [interview] = await buildGuestAttachmentInterviewQuery(
				transaction,
				interviewId,
			);

			if (!interview) {
				return { status: "interview_not_found" as const };
			}

			const [guest] = await transaction
				.select({
					id: guests.id,
					name: guests.name,
					description: guests.description,
				})
				.from(guests)
				.where(eq(guests.id, guestId))
				.limit(1);

			if (!guest) {
				return { status: "guest_not_found" as const };
			}

			const [updated] = await transaction
				.update(interviews)
				.set({ guestId: guest.id, updatedAt: new Date() })
				.where(eq(interviews.id, interview.id))
				.returning({
					id: interviews.id,
					updatedAt: interviews.updatedAt,
				});

			if (!updated) {
				throw new Error("The guest was not attached to the interview.");
			}

			return {
				status: "attached" as const,
				interviewStatus: interview.status,
				publicId: interview.publicId,
				previousGuestId: interview.guestId,
				item: {
					interviewId: updated.id,
					guest,
					updatedAt: updated.updatedAt.toISOString(),
				},
			};
		}),
	);

	if (result.status !== "attached" || result.interviewStatus !== "published") {
		return result;
	}

	const guestChanged = result.previousGuestId !== result.item.guest.id;

	await synchronizePublishedContentAfterCommit({
		publicIds: [result.publicId],
		guestIds: guestChanged
			? [result.previousGuestId, result.item.guest.id].filter(
					(guestId) => guestId !== null,
				)
			: [],
		guestList: guestChanged,
		failureMessage:
			"Synchronizing caches after attaching an interview guest failed.",
	});

	return result;
}
