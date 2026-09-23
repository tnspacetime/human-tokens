import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { PublishedPair } from "../src/contracts.js";
import { writeMarkdownExport } from "../src/markdown-export.js";

const pair: PublishedPair = {
	publicId: "G1uhwZEP34SWonzlB3KAWQ",
	publicationDate: "2026-09-09",
	guest: {
		id: "8da4c91a-c7ac-4f73-88f1-7e7e9de6530c",
		name: "Ada Lovelace",
		description: "Mathematician and writer",
	},
	interview: {
		title: "Computing",
		summary: "A **conversation** about computing.",
		contentMarkdown: "# Why computing?\n\nBecause it matters.",
		portraitUrl: null,
	},
	backgroundReading: {
		title: "Notes on computing",
		summary: "Background *notes*.",
		contentMarkdown: "The complete reading.",
	},
};

test("writes a dated interview and background-reading Markdown file", async () => {
	const directory = await mkdtemp(join(tmpdir(), "human-tokens-export-"));

	try {
		const files = await writeMarkdownExport({
			pair,
			outputDirectory: directory,
		});
		const interview = await readFile(files[0]?.path ?? "", "utf8");
		const backgroundReading = await readFile(files[1]?.path ?? "", "utf8");

		expect(files.map((file) => file.path)).toEqual([
			join(directory, "2026-09-09-interview.md"),
			join(directory, "2026-09-09-background-reading.md"),
		]);
		expect(interview).toContain('date: "2026-09-09"');
		expect(interview).toContain('guest: "Ada Lovelace"');
		expect(interview).toContain("# Computing\n\nA **conversation**");
		expect(backgroundReading).toContain('type: "background_reading"');
		expect(backgroundReading).toContain(
			"# Notes on computing\n\nBackground *notes*.",
		);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("requires force before replacing an existing export", async () => {
	const directory = await mkdtemp(join(tmpdir(), "human-tokens-export-"));
	const interviewPath = join(directory, "2026-09-09-interview.md");

	try {
		await writeFile(interviewPath, "keep me");

		await expect(
			writeMarkdownExport({ pair, outputDirectory: directory }),
		).rejects.toThrow("Use --force");
		expect(await readFile(interviewPath, "utf8")).toBe("keep me");

		await writeMarkdownExport({
			pair,
			outputDirectory: directory,
			force: true,
		});
		expect(await readFile(interviewPath, "utf8")).toContain("# Computing");
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
