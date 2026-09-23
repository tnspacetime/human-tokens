import { expect, test } from "bun:test";

import { Output } from "../src/output.js";
import { type CommandContext, createCommandProgram } from "../src/program.js";

const context = {
	api: {} as CommandContext["api"],
	output: new Output({ interactive: false }),
};

test("guest find only exposes options it uses", () => {
	const program = createCommandProgram(context);
	const guest = program.commands.find((command) => command.name() === "guest");
	const find = guest?.commands.find((command) => command.name() === "find");

	expect(find?.options.map((option) => option.long)).toEqual(["--page-size"]);
});

test("exposes pair publishing as a publish subcommand", () => {
	const program = createCommandProgram(context);
	const publish = program.commands.find(
		(command) => command.name() === "publish",
	);

	expect(publish?.commands.map((command) => command.name())).toEqual(["pair"]);
});

test("exposes pair export as an export subcommand", () => {
	const program = createCommandProgram(context);
	const exportCommand = program.commands.find(
		(command) => command.name() === "export",
	);

	expect(exportCommand?.commands.map((command) => command.name())).toEqual([
		"pair",
	]);
});

test("exposes share creation and revocation as share subcommands", () => {
	const program = createCommandProgram(context);
	const share = program.commands.find((command) => command.name() === "share");

	expect(share?.commands.map((command) => command.name())).toEqual([
		"create",
		"revoke",
	]);
});
