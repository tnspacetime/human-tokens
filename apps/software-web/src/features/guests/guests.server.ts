import { and, asc, desc, eq, gt, isNotNull, or } from "drizzle-orm";

import { withRequestDb } from "../../db";
import { guests, interviews } from "../../db/schema";
import type { PublicGuestResponse, PublicGuestsResponse } from "./guests.types";

export const PUBLIC_GUESTS_DEFAULT_LIMIT = 100;
export const PUBLIC_GUESTS_MAX_LIMIT = 200;

export type PublicGuestsCursor = {
	name: string;
	id: string;
};

export function parsePublicGuestsCursor(
	value: string | null,
): PublicGuestsCursor | null {
	if (!value) {
		return null;
	}

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

function createPublicGuestsCursor({ name, id }: PublicGuestsCursor) {
	return JSON.stringify([name, id]);
}

export async function getPublicGuests({
	limit = PUBLIC_GUESTS_DEFAULT_LIMIT,
	cursor = null,
}: {
	limit?: number;
	cursor?: PublicGuestsCursor | null;
} = {}): Promise<PublicGuestsResponse> {
	return withRequestDb(async (requestDb) => {
		const pageLimit = Math.min(
			Math.max(Math.trunc(limit), 1),
			PUBLIC_GUESTS_MAX_LIMIT,
		);
		const cursorFilter = cursor
			? or(
					gt(guests.name, cursor.name),
					and(eq(guests.name, cursor.name), gt(guests.id, cursor.id)),
				)
			: undefined;
		const rows = await requestDb
			.selectDistinct({
				id: guests.id,
				name: guests.name,
			})
			.from(guests)
			.innerJoin(interviews, eq(interviews.guestId, guests.id))
			.where(
				and(
					eq(interviews.status, "published"),
					isNotNull(interviews.publicationDate),
					cursorFilter,
				),
			)
			.orderBy(asc(guests.name), asc(guests.id))
			.limit(pageLimit + 1);
		const hasNextPage = rows.length > pageLimit;
		const items = rows.slice(0, pageLimit);
		const lastItem = items.at(-1);

		return {
			version: "1",
			items,
			nextCursor:
				hasNextPage && lastItem ? createPublicGuestsCursor(lastItem) : null,
		};
	});
}

export async function getPublicGuest(
	guestId: string,
): Promise<PublicGuestResponse | null> {
	return withRequestDb(async (requestDb) => {
		const [guest] = await requestDb
			.select({
				id: guests.id,
				name: guests.name,
				description: guests.description,
			})
			.from(guests)
			.where(eq(guests.id, guestId))
			.limit(1);

		if (!guest) {
			return null;
		}

		const guestInterviews = await requestDb
			.select({
				publicId: interviews.publicId,
				title: interviews.title,
				summary: interviews.summary,
				publicationDate: interviews.publicationDate,
			})
			.from(interviews)
			.where(
				and(
					eq(interviews.guestId, guestId),
					eq(interviews.status, "published"),
					isNotNull(interviews.publicationDate),
				),
			)
			.orderBy(desc(interviews.publicationDate), desc(interviews.publicId));

		return {
			version: "1",
			item: {
				...guest,
				interviews: guestInterviews.map((interview) => {
					if (!interview.publicationDate) {
						throw new Error(
							`Published interview ${interview.publicId} has no publication date.`,
						);
					}

					return {
						...interview,
						publicationDate: interview.publicationDate,
					};
				}),
			},
		};
	});
}
