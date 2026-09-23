import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { backgroundReadings, guests, interviews } from "../src/db/schema";

config({ path: [".env.local", ".env"] });

const seedGuests = [
	{ name: "Mira Vale", description: "Independent developer" },
	{ name: "Theo Martin", description: "Toolmaker" },
	{ name: "Noor Okafor", description: "Systems engineer" },
	{ name: "Rafael Ortiz", description: "Design engineer" },
	{ name: "Mina Solberg", description: "Open-source maintainer" },
	{ name: "Imani Brooks", description: "Product engineer" },
	{ name: "Jun Park", description: "Creative coder" },
	{ name: "Leila Haddad", description: "Accessibility specialist" },
	{ name: "Tomas Novak", description: "Database engineer" },
	{ name: "Amara Singh", description: "Engineering manager" },
	{ name: "Elias Chen", description: "Security researcher" },
	{ name: "Sofia Mendes", description: "Developer educator" },
	{ name: "Nadia Rahman", description: "Infrastructure engineer" },
	{ name: "Owen Price", description: "Application developer" },
	{ name: "Aya Nakamura", description: "Interaction designer" },
	{ name: "Mateo Silva", description: "Compiler engineer" },
	{ name: "Priya Desai", description: "Distributed-systems engineer" },
	{ name: "Lena Hoffmann", description: "Independent researcher" },
	{ name: "Samir Khalil", description: "Developer tools engineer" },
	{ name: "Grace Liu", description: "Product designer" },
	{ name: "Daniel Mensah", description: "Platform engineer" },
	{ name: "Clara Rossi", description: "Technical writer" },
	{ name: "Yuki Tan", description: "Mobile developer" },
	{ name: "Jonas Berg", description: "Open-source developer" },
];

const interviewMarkdown = `:::question{id="question-1"}
What do you pay attention to before you write the first line?
:::

I try to find the part of the problem that has a human consequence. The code can take several shapes, but the person on the other side should never have to carry confusion we could have resolved for them.

:::question{id="question-2"}
When does a tool begin to feel finished?
:::

A tool feels finished when the person using it stops having to negotiate with it and the work itself can come forward.`;

const backgroundReadingMarkdown = String.raw`## What is latency?

Latency is the elapsed time between asking a system to do something and observing the result. A useful first model is:

$$T_{\mathrm{total}} = T_{\mathrm{network}} + T_{\mathrm{queue}} + T_{\mathrm{compute}} + T_{\mathrm{render}}$$

The complete path matters more than any single fast component. Measure the experience from the reader's action to the rendered result.

~~~ts
const elapsed = performance.now() - startedAt;
~~~

Queueing time grows quickly as incoming work approaches service capacity. Leave headroom, measure tail latency, and make retries respect an end-to-end deadline.`;

async function seed() {
	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		throw new Error("DATABASE_URL is required to seed the database.");
	}

	const pool = new Pool({ connectionString: databaseUrl });
	const database = drizzle(pool);

	try {
		await database.transaction(async (transaction) => {
			const insertedGuests = await transaction
				.insert(guests)
				.values(seedGuests)
				.returning({ id: guests.id, name: guests.name });

			const guestIds = new Map(
				insertedGuests.map((guest) => [guest.name, guest.id]),
			);
			const insertedBackgroundReadings = await transaction
				.insert(backgroundReadings)
				.values(
					seedGuests.map((guest, index) => ({
						title: `${guest.name}: technical background`,
						summary: `A technical companion to the conversation with ${guest.name}.`,
						contentMarkdown: backgroundReadingMarkdown,
						status: "published" as const,
						publicationDate: `2026-08-${String(seedGuests.length - index).padStart(2, "0")}`,
					})),
				)
				.returning({
					id: backgroundReadings.id,
					title: backgroundReadings.title,
				});

			const backgroundReadingIds = new Map(
				insertedBackgroundReadings.map((reading) => [
					reading.title,
					reading.id,
				]),
			);

			await transaction.insert(interviews).values(
				seedGuests.map((guest, index) => {
					const guestId = guestIds.get(guest.name);
					const backgroundReadingId = backgroundReadingIds.get(
						`${guest.name}: technical background`,
					);

					if (!guestId) {
						throw new Error(`Missing inserted guest: ${guest.name}`);
					}
					if (!backgroundReadingId) {
						throw new Error(
							`Missing inserted background reading: ${guest.name}`,
						);
					}

					return {
						guestId,
						backgroundReadingId,
						publicId: `seed_interview_${String(index + 1).padStart(10, "0")}`,
						title: `${guest.name} on building software with care.`,
						summary: `A conversation with ${guest.name} about craft, judgment, and the details that make software worth using.`,
						contentMarkdown: interviewMarkdown,
						status: "published" as const,
						publicationDate: `2026-08-${String(seedGuests.length - index).padStart(2, "0")}`,
					};
				}),
			);
		});

		console.log(
			`Seeded ${seedGuests.length} guests, ${seedGuests.length} interviews, and ${seedGuests.length} background readings.`,
		);
	} finally {
		await pool.end();
	}
}

seed().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
