import { strict as assert } from "node:assert";
import { test } from "node:test";
import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "../../db/schema";
import { buildGuestAttachmentInterviewQuery } from "./admin-queries";

test("reading the previous guest locks the interview until reassignment", () => {
	const queryDb = drizzle.mock({ schema });
	const query = buildGuestAttachmentInterviewQuery(queryDb, "interview-id");

	assert.match(query.toSQL().sql, /\bfor update$/);
});
