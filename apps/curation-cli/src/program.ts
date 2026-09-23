import { cancel, confirm, isCancel, select, text } from "@clack/prompts";
import { Command, InvalidArgumentError } from "commander";
import open from "open";
import { z } from "zod";

import type { CurationApiClient } from "./api-client.js";
import { collectPages } from "./api-client.js";
import type { Guest, InterviewDetail, InterviewListItem } from "./contracts.js";
import { writeMarkdownExport } from "./markdown-export.js";
import type { Output } from "./output.js";

const VERSION = "0.1.0";
const uuidSchema = z.string().uuid();
const publicIdSchema = z.string().regex(/^[A-Za-z0-9_-]{22,}$/);

type CurationApi = Pick<
	CurationApiClient,
	| "createDraft"
	| "createShareSnapshot"
	| "revokeShareSnapshot"
	| "createGuest"
	| "listGuests"
	| "listInterviews"
	| "getInterview"
	| "getPublishedPair"
	| "attachGuest"
	| "publishPair"
>;

export type CommandContext = {
	api: CurationApi;
	output: Output;
};

export class CliError extends Error {
	readonly code: string;

	constructor(message: string, code = "invalid_arguments") {
		super(message);
		this.name = "CliError";
		this.code = code;
	}
}

export class CancelledError extends Error {
	constructor() {
		super("Operation cancelled.");
		this.name = "CancelledError";
	}
}

function positiveInteger(value: string) {
	const parsed = Number(value);

	if (!Number.isSafeInteger(parsed) || parsed < 1) {
		throw new InvalidArgumentError("Value must be a positive integer.");
	}

	return parsed;
}

function pageSize(value: string) {
	const parsed = positiveInteger(value);

	if (parsed > 200) {
		throw new InvalidArgumentError("Page size cannot exceed 200.");
	}

	return parsed;
}

function ensureUuid(value: string, label: string) {
	if (!uuidSchema.safeParse(value).success) {
		throw new CliError(`${label} must be a UUID.`);
	}
}

function ensurePublicId(value: string) {
	if (!publicIdSchema.safeParse(value).success) {
		throw new CliError("Public ID is invalid.");
	}
}

function promptValue<T>(value: T | symbol): T {
	if (isCancel(value)) {
		throw new CancelledError();
	}

	return value as T;
}

function normalizeContentKind(value: string) {
	if (value === "interview") return "interview" as const;
	if (
		value === "background" ||
		value === "background-reading" ||
		value === "background_reading"
	) {
		return "background_reading" as const;
	}

	return null;
}

function contentKindLabel(kind: "interview" | "background_reading") {
	return kind === "interview" ? "Interview" : "Background reading";
}

function requireInteractive(output: Output, message: string) {
	if (!output.interactive) throw new CliError(message);
}

function formatLocalDate(value: string) {
	return new Date(value).toLocaleString();
}

function contributionLabel(item: InterviewListItem) {
	if (!item.guestContribution) return "—";
	return item.guestContribution.status === "submitted"
		? "submitted"
		: "awaiting";
}

function printGuests(output: Output, guests: Guest[]) {
	if (guests.length === 0) {
		output.info("No guests found.");
		return;
	}

	output.table({
		headers: ["ID", "Name"],
		rows: guests.map((guest) => [guest.id, guest.name]),
		maximumWidths: [36, 42],
	});
	output.line();
	output.info(`${guests.length} guest${guests.length === 1 ? "" : "s"}`);
}

function printInterviews(output: Output, interviews: InterviewListItem[]) {
	if (interviews.length === 0) {
		output.info("No interviews found.");
		return;
	}

	output.table({
		headers: ["ID", "Status", "Guest", "Contribution", "Updated", "Title"],
		rows: interviews.map((interview) => [
			interview.id,
			interview.status,
			interview.guest?.name ?? "—",
			contributionLabel(interview),
			formatLocalDate(interview.updatedAt),
			interview.title || "—",
		]),
		maximumWidths: [36, 10, 24, 12, 22, 42],
	});
	output.line();
	output.info(
		`${interviews.length} interview${interviews.length === 1 ? "" : "s"}`,
	);
}

function printInterview(output: Output, interview: InterviewDetail) {
	output.details([
		["ID", interview.id],
		["Public ID", interview.publicId],
		["Status", interview.status],
		["Portrait image ID", interview.portraitImageId],
		["Guest", interview.guest?.name ?? null],
		["Guest ID", interview.guest?.id],
		["Contribution", interview.guestContribution?.status ?? null],
		[
			"Submitted",
			interview.guestContribution?.status === "submitted"
				? formatLocalDate(interview.guestContribution.submittedAt)
				: undefined,
		],
		["Background", interview.backgroundReadingId],
		["Publication", interview.publicationDate],
		["Created", formatLocalDate(interview.createdAt)],
		["Updated", formatLocalDate(interview.updatedAt)],
	]);
	output.line();
	output.line(interview.title || "(Untitled)");
	if (interview.summary) {
		output.line();
		output.line(interview.summary);
	}
	if (interview.contentMarkdown) {
		output.line();
		output.line(interview.contentMarkdown);
	}
}

async function openDraftUrl(value: string) {
	let url: URL;

	try {
		url = new URL(value);
	} catch {
		throw new CliError("Draft URL must be a valid absolute URL.");
	}

	if (
		(url.protocol !== "http:" && url.protocol !== "https:") ||
		!/^\/draft\/[A-Za-z0-9_-]+$/.test(url.pathname)
	) {
		throw new CliError("The URL must be an HTTP(S) /draft/<token> URL.");
	}

	await open(url.toString());
	return url.toString();
}

async function loadGuests(
	{ api, output }: CommandContext,
	{ query, limit }: { query?: string; limit: number },
) {
	const guests = await output.task("Loading guests", () =>
		collectPages((cursor) =>
			api.listGuests({
				query: query?.trim() || undefined,
				limit,
				cursor,
			}),
		),
	);

	printGuests(output, guests);
}

function configureDraftCommands(program: Command, context: CommandContext) {
	const { api, output } = context;
	const draft = program.command("draft").description("Manage authoring drafts");

	draft
		.command("create")
		.description("Create an interview or background-reading draft")
		.argument("[kind]", "interview or background")
		.option(
			"-e, --expires-in-days <days>",
			"number of days before the authoring link expires",
			positiveInteger,
			30,
		)
		.option("--open", "open the new draft link in the default browser")
		.action(
			async (
				kind: string | undefined,
				options: { expiresInDays: number; open?: boolean },
			) => {
				output.start("Human Tokens · Create draft");
				let selectedKind = kind ? normalizeContentKind(kind) : null;

				if (!selectedKind) {
					if (kind) {
						throw new CliError("Draft kind must be interview or background.");
					}

					requireInteractive(
						output,
						"Draft kind is required: interview or background.",
					);
					selectedKind = promptValue(
						await select({
							message: "What kind of draft?",
							options: [
								{ value: "interview", label: "Interview" },
								{
									value: "background_reading",
									label: "Background reading",
								},
							],
						}),
					);
				}

				const response = await output.task("Creating draft", () =>
					api.createDraft({
						kind: selectedKind,
						expiresInDays: options.expiresInDays,
					}),
				);
				let opened = false;

				if (options.open) {
					await openDraftUrl(response.draftUrl);
					opened = true;
				}

				output.success("Draft created");
				output.details([
					["Interview ID", response.interviewId],
					["Draft URL", response.draftUrl],
					["Expires", formatLocalDate(response.expiresAt)],
				]);
				output.done(opened ? "Created and opened" : "Created");
			},
		);

	draft
		.command("open")
		.description("Open an existing draft URL in the default browser")
		.argument("<url>", "complete secret draft URL")
		.action(async (url: string) => {
			await openDraftUrl(url);
			output.success("Draft opened in the default browser.");
		});
}

function configureGuestCommands(program: Command, context: CommandContext) {
	const { api, output } = context;
	const guest = program.command("guest").description("Manage guests");

	guest
		.command("create")
		.description("Create a reusable guest record")
		.option("--name <name>", "guest name")
		.option("--description <description>", "guest description")
		.action(async (options: { name?: string; description?: string }) => {
			output.start("Human Tokens · Create guest");
			let name = options.name?.trim();
			let description = options.description?.trim();

			if (!name) {
				requireInteractive(output, "Guest name is required.");
				name = promptValue(
					await text({
						message: "Guest name",
						validate: (value) =>
							value?.trim() ? undefined : "Name cannot be empty.",
					}),
				).trim();
			}

			if (!description) {
				requireInteractive(output, "Guest description is required.");
				description = promptValue(
					await text({
						message: "Guest description",
						validate: (value) =>
							value?.trim() ? undefined : "Description cannot be empty.",
					}),
				).trim();
			}

			const response = await output.task("Creating guest", () =>
				api.createGuest({ name, description }),
			);

			output.success("Guest created");
			output.details([
				["ID", response.item.id],
				["Name", response.item.name],
			]);
			output.done("Created");
		});

	guest
		.command("list")
		.description("List or search every guest")
		.option("--query <name>", "case-insensitive name search")
		.option(
			"--page-size <count>",
			"records requested per API call",
			pageSize,
			100,
		)
		.action((options: { query?: string; pageSize: number }) =>
			loadGuests(context, {
				query: options.query,
				limit: options.pageSize,
			}),
		);

	guest
		.command("find")
		.description("Find guest candidates by name")
		.argument("<name>", "full or partial name")
		.option(
			"--page-size <count>",
			"records requested per API call",
			pageSize,
			100,
		)
		.action((name: string, options: { pageSize: number }) =>
			loadGuests(context, { query: name, limit: options.pageSize }),
		);
}

function configureInterviewCommands(program: Command, context: CommandContext) {
	const { api, output } = context;
	const interview = program
		.command("interview")
		.description("Manage interviews");

	interview
		.command("list")
		.description("List or search every interview")
		.option("--query <text>", "search title or public ID")
		.option(
			"--page-size <count>",
			"records requested per API call",
			pageSize,
			100,
		)
		.action(async (options: { query?: string; pageSize: number }) => {
			const interviews = await output.task("Loading interviews", () =>
				collectPages((cursor) =>
					api.listInterviews({
						query: options.query?.trim() || undefined,
						limit: options.pageSize,
						cursor,
					}),
				),
			);

			printInterviews(output, interviews);
		});

	interview
		.command("show")
		.description("Show one complete administrative interview record")
		.argument("<interview-id>", "interview UUID")
		.action(async (interviewId: string) => {
			ensureUuid(interviewId, "Interview ID");
			const response = await output.task("Loading interview", () =>
				api.getInterview(interviewId),
			);

			printInterview(output, response.item);
		});

	interview
		.command("attach-guest")
		.description("Attach an existing guest to an interview")
		.argument("<interview-id>", "interview UUID")
		.argument("<guest-id>", "guest UUID")
		.option("-y, --yes", "replace an existing guest without confirmation")
		.action(
			async (
				interviewId: string,
				guestId: string,
				options: { yes?: boolean },
			) => {
				ensureUuid(interviewId, "Interview ID");
				ensureUuid(guestId, "Guest ID");
				const current = await output.task("Checking interview", () =>
					api.getInterview(interviewId),
				);

				if (current.item.guest?.id === guestId) {
					output.success(`${current.item.guest.name} is already attached.`);
					return;
				}

				if (current.item.guest && !options.yes) {
					requireInteractive(
						output,
						`Interview already has guest ${current.item.guest.name}. Use --yes to replace them without confirmation.`,
					);
					const approved = promptValue(
						await confirm({
							message: `Replace ${current.item.guest.name} on this interview?`,
							initialValue: false,
						}),
					);

					if (!approved) {
						cancel("Guest was not changed.");
						return;
					}
				}

				const response = await output.task("Attaching guest", () =>
					api.attachGuest(interviewId, guestId),
				);

				output.success("Guest attached");
				output.details([
					["Interview ID", response.item.interviewId],
					["Guest", response.item.guest.name],
					["Guest ID", response.item.guest.id],
					["Updated", formatLocalDate(response.item.updatedAt)],
				]);
			},
		);
}

function configurePublishCommands(program: Command, context: CommandContext) {
	const { api, output } = context;
	const publish = program
		.command("publish")
		.description("Publish curated content");

	publish
		.command("pair")
		.description("Publish one interview with one background reading")
		.argument("<interview-id>", "interview UUID")
		.argument("<background-reading-id>", "background-reading UUID")
		.action(async (interviewId: string, backgroundReadingId: string) => {
			ensureUuid(interviewId, "Interview ID");
			ensureUuid(backgroundReadingId, "Background-reading ID");
			output.start("Human Tokens · Publish pair");

			const response = await output.task("Publishing pair", () =>
				api.publishPair(interviewId, backgroundReadingId),
			);

			output.success("Pair published");
			output.details([
				["Public ID", response.item.publicId],
				["Publication date", response.item.publicationDate],
				["Guest", response.item.guest.name],
				["Interview", response.item.interview.title],
				["Background reading", response.item.backgroundReading.title],
			]);
			output.done("Published");
		});
}

function configureShareCommands(program: Command, context: CommandContext) {
	const { api, output } = context;
	const share = program
		.command("share")
		.description("Manage standalone share links");

	share
		.command("create")
		.description("Create a fixed shareable copy of unpublished content")
		.argument("<kind>", "interview or background-reading")
		.argument("<source-id>", "source interview or background-reading UUID")
		.action(async (kind: string, sourceId: string) => {
			const selectedKind = normalizeContentKind(kind);

			if (!selectedKind) {
				throw new CliError(
					"Share kind must be interview or background-reading.",
				);
			}

			ensureUuid(sourceId, "Source ID");
			output.start("Human Tokens · Create share link");

			const response = await output.task("Creating share link", () =>
				api.createShareSnapshot({ kind: selectedKind, sourceId }),
			);

			output.success("Share link created");
			output.details([
				["Snapshot ID", response.snapshotId],
				["Kind", contentKindLabel(response.kind)],
				["Share URL", response.shareUrl],
				["Created", formatLocalDate(response.createdAt)],
			]);
			output.done("Created");
		});

	share
		.command("revoke")
		.description("Revoke a standalone share link")
		.argument("<snapshot-id>", "share snapshot UUID")
		.action(async (snapshotId: string) => {
			ensureUuid(snapshotId, "Snapshot ID");
			output.start("Human Tokens · Revoke share link");

			const response = await output.task("Revoking share link", () =>
				api.revokeShareSnapshot(snapshotId),
			);

			output.success("Share link revoked");
			output.details([
				["Snapshot ID", snapshotId],
				["Revoked", formatLocalDate(response.revokedAt)],
			]);
			output.done("Revoked");
		});
}

function configureExportCommands(program: Command, context: CommandContext) {
	const { api, output } = context;
	const exportCommand = program
		.command("export")
		.description("Export published content as Markdown");

	exportCommand
		.command("pair")
		.description("Export one published pair as two Markdown files")
		.argument("<public-id>", "published interview public ID")
		.requiredOption("-o, --out <directory>", "output directory")
		.option("--force", "replace existing export files")
		.action(
			async (publicId: string, options: { out: string; force?: boolean }) => {
				ensurePublicId(publicId);
				output.start("Human Tokens · Export pair");

				const response = await output.task("Loading published pair", () =>
					api.getPublishedPair(publicId),
				);
				const files = await output.task("Writing Markdown files", () =>
					writeMarkdownExport({
						pair: response.item,
						outputDirectory: options.out,
						force: options.force,
					}),
				);

				output.success("Pair exported");
				output.details([
					["Interview", files[0]?.path],
					["Background reading", files[1]?.path],
				]);
				output.done("Exported");
			},
		);
}

export function createCommandProgram(context: CommandContext) {
	const program = new Command();

	program
		.name("human-tokens")
		.description("Curate Human Tokens from the interactive command shell")
		.showSuggestionAfterError()
		.exitOverride()
		.addHelpText(
			"after",
			"\nSession controls:\n  clear  Clear the terminal\n  exit   Close Human Tokens\n  quit   Close Human Tokens\n\nType help <command> for detailed command help.",
		);

	program
		.command("version")
		.description("Show the Human Tokens CLI version")
		.action(() => context.output.line(VERSION));

	configureDraftCommands(program, context);
	configureGuestCommands(program, context);
	configureInterviewCommands(program, context);
	configurePublishCommands(program, context);
	configureShareCommands(program, context);
	configureExportCommands(program, context);

	return program;
}
