import { strict as assert } from "node:assert";
import { test } from "node:test";
import { runPostCommitPublicationSync } from "./publication-sync";

const doNotWait = async () => {};

test("a successful post-commit sync does not schedule background work", async () => {
	let attempts = 0;
	let scheduled = false;

	await runPostCommitPublicationSync({
		operation: async () => {
			attempts += 1;
		},
		schedule: () => {
			scheduled = true;
		},
		onFailure: () => {
			throw new Error("The sync should not fail.");
		},
		wait: doNotWait,
	});

	assert.equal(attempts, 1);
	assert.equal(scheduled, false);
});

test("a failed post-commit sync retries without rejecting the committed save", async () => {
	let attempts = 0;
	let scheduledTask: Promise<void> | null = null;

	await runPostCommitPublicationSync({
		operation: async () => {
			attempts += 1;

			if (attempts < 3) {
				throw new Error("Temporary cache failure");
			}
		},
		schedule: (task) => {
			scheduledTask = task;
		},
		onFailure: () => {
			throw new Error("The retry should recover.");
		},
		retryDelaysMs: [0, 0, 0],
		wait: doNotWait,
	});

	assert.notEqual(scheduledTask, null);
	await scheduledTask;
	assert.equal(attempts, 3);
});

test("exhausted retries are reported without rejecting the committed save", async () => {
	const failures: unknown[] = [];
	let scheduledTask: Promise<void> | null = null;

	await runPostCommitPublicationSync({
		operation: async () => {
			throw new Error("Persistent cache failure");
		},
		schedule: (task) => {
			scheduledTask = task;
		},
		onFailure: (error) => failures.push(error),
		retryDelaysMs: [0, 0],
		wait: doNotWait,
	});

	assert.notEqual(scheduledTask, null);
	await scheduledTask;
	assert.equal(failures.length, 1);
	assert.ok(failures[0] instanceof Error);
});
