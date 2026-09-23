#!/usr/bin/env node

import { log } from "@clack/prompts";

import { CurationApiClient } from "./api-client.js";
import { loadConfiguration } from "./config.js";
import { Output } from "./output.js";
import { runShell } from "./shell.js";

function fail(message: string) {
	log.error(message);
	process.exitCode = 1;
}

const argumentsAfterExecutable = process.argv.slice(2);

if (argumentsAfterExecutable.length > 0) {
	fail(
		'Human Tokens is an interactive command shell. Start it without arguments, then type "help" inside the session.',
	);
} else if (!process.stdin.isTTY || !process.stdout.isTTY) {
	fail("Human Tokens requires an interactive terminal.");
} else {
	try {
		const configuration = loadConfiguration({});
		const api = new CurationApiClient({
			baseUrl: configuration.apiUrl,
			token: configuration.token,
		});
		const output = new Output({ interactive: true });

		await runShell({
			apiUrl: configuration.apiUrl,
			context: { api, output },
		});
	} catch (error) {
		fail(
			error instanceof Error ? error.message : "Human Tokens could not start.",
		);
	}
}
