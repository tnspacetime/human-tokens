import { env } from "cloudflare:workers";
import { and, eq, isNotNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

import * as schema from "../../db/schema";
import { backgroundReadings, interviews } from "../../db/schema";

export async function readPublicInterviewPortrait(
	publicId: string,
): Promise<R2ObjectBody | null> {
	const client = new Client({ connectionString: env.DATABASE_URL });
	await client.connect();

	let portraitImageId: string | null = null;

	try {
		const requestDb = drizzle(client, { schema });
		const [row] = await requestDb
			.select({ portraitImageId: interviews.portraitImageId })
			.from(interviews)
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

		portraitImageId = row?.portraitImageId ?? null;
	} finally {
		await client.end();
	}

	if (!portraitImageId) {
		return null;
	}

	return env.HUMAN_TOKENS_SOFTWARE_MEDIA.get(portraitImageId);
}
