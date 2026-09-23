import { and, desc, eq, isNotNull, lt, or } from "drizzle-orm";

import { withRequestDb } from "../../db";
import { backgroundReadings, interviews } from "../../db/schema";
import { isValidInterviewPublicId } from "./interview-public";
import type { PublicInterviewsResponse } from "./interviews.types";

export const PUBLIC_INTERVIEWS_DEFAULT_LIMIT = 20;
export const PUBLIC_INTERVIEWS_MAX_LIMIT = 50;

const PUBLICATION_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CURSOR_SEPARATOR = "~";

export type PublicInterviewsCursor = {
	publicationDate: string;
	publicId: string;
};

export function parsePublicInterviewsCursor(
	value: string,
): PublicInterviewsCursor | null {
	const [publicationDate, publicId, extra] = value.split(CURSOR_SEPARATOR);

	if (
		!publicationDate ||
		!publicId ||
		extra !== undefined ||
		!PUBLICATION_DATE_PATTERN.test(publicationDate) ||
		!isValidInterviewPublicId(publicId)
	) {
		return null;
	}

	return { publicationDate, publicId };
}

function createPublicInterviewsCursor({
	publicationDate,
	publicId,
}: PublicInterviewsCursor) {
	return `${publicationDate}${CURSOR_SEPARATOR}${publicId}`;
}

export async function getPublicInterviews({
	limit = PUBLIC_INTERVIEWS_DEFAULT_LIMIT,
	cursor = null,
}: {
	limit?: number;
	cursor?: PublicInterviewsCursor | null;
} = {}): Promise<PublicInterviewsResponse> {
	return withRequestDb(async (requestDb) => {
		const publishedFilter = and(
			eq(interviews.status, "published"),
			isNotNull(interviews.publicationDate),
			eq(backgroundReadings.status, "published"),
			isNotNull(backgroundReadings.publicationDate),
		);
		const cursorFilter = cursor
			? or(
					lt(interviews.publicationDate, cursor.publicationDate),
					and(
						eq(interviews.publicationDate, cursor.publicationDate),
						lt(interviews.publicId, cursor.publicId),
					),
				)
			: undefined;
		const rows = await requestDb
			.select({
				publicId: interviews.publicId,
				title: interviews.title,
				publicationDate: interviews.publicationDate,
			})
			.from(interviews)
			.innerJoin(
				backgroundReadings,
				eq(interviews.backgroundReadingId, backgroundReadings.id),
			)
			.where(and(publishedFilter, cursorFilter))
			.orderBy(desc(interviews.publicationDate), desc(interviews.publicId))
			.limit(limit + 1);
		const hasNextPage = rows.length > limit;
		const items = rows.slice(0, limit).map((interview) => {
			if (!interview.publicationDate) {
				throw new Error(
					`Published interview ${interview.publicId} has no publication date.`,
				);
			}

			return {
				...interview,
				publicationDate: interview.publicationDate,
			};
		});
		const lastItem = items.at(-1);

		return {
			version: "1",
			items,
			nextCursor:
				hasNextPage && lastItem ? createPublicInterviewsCursor(lastItem) : null,
		};
	});
}
