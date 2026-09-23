import { access, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { PublishedPair } from "./contracts.js";

export type MarkdownExportFile = {
	kind: "interview" | "background_reading";
	path: string;
	content: string;
};

function yamlString(value: string) {
	return JSON.stringify(value);
}

function markdownDocument({
	title,
	date,
	type,
	guest,
	summary,
	content,
}: {
	title: string;
	date: string;
	type: "interview" | "background_reading";
	guest?: string;
	summary: string;
	content: string;
}) {
	return [
		"---",
		`title: ${yamlString(title)}`,
		`date: ${yamlString(date)}`,
		`type: ${yamlString(type)}`,
		...(guest ? [`guest: ${yamlString(guest)}`] : []),
		"---",
		"",
		`# ${title.trim()}`,
		"",
		summary.trim(),
		"",
		content.trim(),
		"",
	].join("\n");
}

export function createMarkdownExportFiles(
	pair: PublishedPair,
	outputDirectory: string,
): MarkdownExportFile[] {
	const directory = resolve(outputDirectory);
	const date = pair.publicationDate;

	return [
		{
			kind: "interview",
			path: resolve(directory, `${date}-interview.md`),
			content: markdownDocument({
				title: pair.interview.title,
				date,
				type: "interview",
				guest: pair.guest.name,
				summary: pair.interview.summary,
				content: pair.interview.contentMarkdown,
			}),
		},
		{
			kind: "background_reading",
			path: resolve(directory, `${date}-background-reading.md`),
			content: markdownDocument({
				title: pair.backgroundReading.title,
				date,
				type: "background_reading",
				summary: pair.backgroundReading.summary,
				content: pair.backgroundReading.contentMarkdown,
			}),
		},
	];
}

async function exists(path: string) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

export async function writeMarkdownExport({
	pair,
	outputDirectory,
	force = false,
}: {
	pair: PublishedPair;
	outputDirectory: string;
	force?: boolean;
}) {
	const files = createMarkdownExportFiles(pair, outputDirectory);
	const existingFiles = force
		? []
		: (
				await Promise.all(
					files.map(async (file) =>
						(await exists(file.path)) ? file.path : null,
					),
				)
			).filter((path): path is string => path !== null);

	if (existingFiles.length > 0) {
		throw new Error(
			`Refusing to overwrite ${existingFiles.join(", ")}. Use --force to replace existing files.`,
		);
	}

	await mkdir(resolve(outputDirectory), { recursive: true });

	for (const file of files) {
		await writeFile(file.path, file.content, {
			encoding: "utf8",
			flag: force ? "w" : "wx",
		});
	}

	return files;
}
