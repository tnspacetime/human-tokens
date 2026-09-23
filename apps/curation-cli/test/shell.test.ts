import { expect, test } from "bun:test";

import { Output } from "../src/output.js";
import type { CommandContext } from "../src/program.js";
import { CliError } from "../src/program.js";
import { parseShellInput, runShell } from "../src/shell.js";

class TestOutput extends Output {
	readonly messages: string[] = [];

	constructor() {
		super({ interactive: false });
	}

	override start(message: string) {
		this.messages.push(message);
	}

	override done(message: string) {
		this.messages.push(message);
	}

	override info(message: string) {
		this.messages.push(message);
	}

	override error(message: string) {
		this.messages.push(message);
	}

	override line(message = "") {
		this.messages.push(message);
	}
}

test("parses quoted commands and session controls", () => {
	expect(parseShellInput('guest find "Ada Lovelace"')).toEqual({
		kind: "command",
		args: ["guest", "find", "Ada Lovelace"],
	});
	expect(parseShellInput("clear")).toEqual({ kind: "clear" });
	expect(parseShellInput("quit")).toEqual({ kind: "exit" });
	expect(parseShellInput("   ")).toEqual({ kind: "empty" });
});

test("rejects shell operators instead of executing them", () => {
	expect(() => parseShellInput("guest list && exit")).toThrow(CliError);
});

test("runs multiple commands with one API context", async () => {
	let guestRequests = 0;
	let interviewRequests = 0;
	const output = new TestOutput();
	const context = {
		api: {
			async listGuests() {
				guestRequests += 1;
				return { version: "1", items: [], nextCursor: null };
			},
			async listInterviews() {
				interviewRequests += 1;
				return { version: "1", items: [], nextCursor: null };
			},
		} as unknown as CommandContext["api"],
		output,
	};
	const lines = ["guest list", "interview list", "version", "exit"];
	let index = 0;

	await runShell({
		context,
		apiUrl: "https://example.com",
		reader: async (history) => {
			const line = lines[index++];
			return line === undefined ? null : { line, history: [line, ...history] };
		},
	});

	expect(guestRequests).toBe(1);
	expect(interviewRequests).toBe(1);
	expect(output.messages).toContain("0.1.0");
	expect(output.messages.at(-1)).toBe("Session closed");
});
