import { eq } from "drizzle-orm";

import type { RequestDb } from "../../db";
import { interviews } from "../../db/schema";

export function buildGuestAttachmentInterviewQuery(
	queryDb: Pick<RequestDb, "select">,
	interviewId: string,
) {
	return queryDb
		.select({
			id: interviews.id,
			publicId: interviews.publicId,
			guestId: interviews.guestId,
			status: interviews.status,
		})
		.from(interviews)
		.where(eq(interviews.id, interviewId))
		.limit(1)
		.for("update");
}
