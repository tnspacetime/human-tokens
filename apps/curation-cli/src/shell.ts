import { type CompleterResult, createInterface } from "node:readline";
import { cancel } from "@clack/prompts";
import chalk from "chalk";
import { CommanderError } from "commander";
import { parse } from "shell-quote";

import { ApiError, InvalidApiResponseError } from "./api-client.js";
import {
	CancelledError,
	CliError,
	type CommandContext,
	createCommandProgram,
} from "./program.js";

const COMPLETIONS = [
	"help",
	"help draft",
	"help guest",
	"help interview",
	"help publish",
	"help share",
	"help export",
	"version",
	"draft create",
	"draft open",
	"guest create",
	"guest list",
	"guest find",
	"interview list",
	"interview show",
	"interview attach-guest",
	"publish pair",
	"share create",
	"share revoke",
	"export pair",
	"clear",
	"exit",
	"quit",
];

export type ShellDirective =
	| { kind: "empty" }
	| { kind: "clear" }
	| { kind: "exit" }
	| { kind: "command"; args: string[] };

type ReadResult = { line: string; history: string[] } | null;
type CommandReader = (history: string[]) => Promise<ReadResult>;

function completeCommand(line: string): CompleterResult {
	const matches = COMPLETIONS.filter((command) => command.startsWith(line));
	return [matches.length > 0 ? matches : COMPLETIONS, line];
}

function readCommand(history: string[]): Promise<ReadResult> {
	const terminal = createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: true,
		history: [...history],
		historySize: 500,
		removeHistoryDuplicates: true,
		completer: completeCommand,
	});
	const prompt = `${chalk.bold.hex("#f97316")("human-tokens")} ${chalk.dim(">")} `;
	return new Promise((resolve) => {
		let settled = false;
		const finish = (result: ReadResult) => {
			if (settled) return;
			settled = true;
			resolve(result);
		};

		terminal.once("line", (line) => {
			const normalizedLine = line.trim();
			const nextHistory = normalizedLine
				? [
						normalizedLine,
						...history.filter((entry) => entry !== normalizedLine),
					].slice(0, 500)
				: history;
			finish({ line, history: nextHistory });
			terminal.close();
		});
		terminal.once("close", () => finish(null));
		terminal.setPrompt(prompt);
		terminal.prompt();
	});
}

export function parseShellInput(line: string): ShellDirective {
	let entries: ReturnType<typeof parse>;

	try {
		entries = parse(line, (name) => `$${name}`);
	} catch (error) {
		throw new CliError(
			error instanceof Error
				? `Could not parse command: ${error.message}`
				: "Could not parse command.",
		);
	}

	if (entries.some((entry) => typeof entry !== "string")) {
		throw new CliError(
			"Shell operators, comments, and wildcard expansion are not supported.",
		);
	}

	const args = entries as string[];

	if (args.length === 0) return { kind: "empty" };
	if (args.length === 1 && (args[0] === "exit" || args[0] === "quit")) {
		return { kind: "exit" };
	}
	if (args.length === 1 && args[0] === "clear") return { kind: "clear" };

	return { kind: "command", args };
}

export async function executeCommand(args: string[], context: CommandContext) {
	try {
		await createCommandProgram(context).parseAsync(args, { from: "user" });
	} catch (error) {
		if (error instanceof CommanderError) return;
		throw error;
	}
}

function errorMessage(error: unknown) {
	if (
		error instanceof ApiError ||
		error instanceof InvalidApiResponseError ||
		error instanceof CliError
	) {
		return error.message;
	}

	return error instanceof Error
		? error.message
		: "An unexpected error occurred.";
}

export async function runShell({
	context,
	apiUrl,
	reader = readCommand,
	clear = () => process.stdout.write("\u001Bc"),
}: {
	context: CommandContext;
	apiUrl: string;
	reader?: CommandReader;
	clear?: () => void;
}) {
	context.output.start("Human Tokens Curation");
	context.output.info(`Connected to ${apiUrl}`);
	context.output.info('Type "help" for commands and "exit" when finished.');

	let history: string[] = [];

	while (true) {
		const input = await reader(history);
		if (!input) break;
		history = input.history;

		let directive: ShellDirective;

		try {
			directive = parseShellInput(input.line);
		} catch (error) {
			context.output.error(errorMessage(error));
			continue;
		}

		if (directive.kind === "empty") continue;
		if (directive.kind === "exit") break;
		if (directive.kind === "clear") {
			clear();
			continue;
		}

		try {
			await executeCommand(directive.args, context);
		} catch (error) {
			if (error instanceof CancelledError) {
				cancel(error.message);
				continue;
			}

			context.output.error(errorMessage(error));
		}
	}

	context.output.done("Session closed");
}
