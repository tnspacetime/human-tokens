import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

import * as schema from "./schema";

function createRequestDb(client: Client) {
	return drizzle(client, { schema });
}

export type RequestDb = ReturnType<typeof createRequestDb>;

export async function withRequestDb<T>(
	operation: (requestDb: RequestDb) => Promise<T>,
) {
	const client = new Client({ connectionString: env.DATABASE_URL });
	await client.connect();

	try {
		return await operation(createRequestDb(client));
	} finally {
		await client.end();
	}
}
