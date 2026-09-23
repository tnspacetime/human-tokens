import type { z } from "zod";
import type { ShareSnapshotKind } from "./contracts.js";
import {
	apiErrorResponseSchema,
	attachGuestResponseSchema,
	createDraftResponseSchema,
	createGuestResponseSchema,
	createShareSnapshotResponseSchema,
	guestListResponseSchema,
	interviewListResponseSchema,
	interviewResponseSchema,
	publicPairResponseSchema,
	publishPairResponseSchema,
	revokeShareSnapshotResponseSchema,
} from "./contracts.js";

type Fetcher = typeof globalThis.fetch;
const DEFAULT_TIMEOUT_MS = 30_000;

export class ApiError extends Error {
	readonly status: number;
	readonly code: string;

	constructor({
		status,
		code,
		message,
	}: {
		status: number;
		code: string;
		message: string;
	}) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.code = code;
	}
}

export class InvalidApiResponseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InvalidApiResponseError";
	}
}

export class CurationApiClient {
	readonly #baseUrl: string;
	readonly #token: string;
	readonly #fetcher: Fetcher;
	readonly #timeoutMs: number;

	constructor({
		baseUrl,
		token,
		fetcher = globalThis.fetch,
		timeoutMs = DEFAULT_TIMEOUT_MS,
	}: {
		baseUrl: string;
		token: string;
		fetcher?: Fetcher;
		timeoutMs?: number;
	}) {
		this.#baseUrl = baseUrl.replace(/\/+$/, "");
		this.#token = token;
		this.#fetcher = fetcher;
		this.#timeoutMs = timeoutMs;
	}

	async #request<T>(
		path: string,
		schema: z.ZodType<T>,
		init: RequestInit = {},
	): Promise<T> {
		let response: Response;

		try {
			response = await this.#fetcher(`${this.#baseUrl}${path}`, {
				...init,
				signal: init.signal ?? AbortSignal.timeout(this.#timeoutMs),
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${this.#token}`,
					...(init.body ? { "Content-Type": "application/json" } : {}),
					...init.headers,
				},
			});
		} catch (error) {
			const timedOut = error instanceof Error && error.name === "TimeoutError";

			throw new ApiError({
				status: 0,
				code: timedOut ? "request_timeout" : "network_error",
				message: timedOut
					? `The curation API did not respond within ${this.#timeoutMs}ms.`
					: error instanceof Error
						? `Could not reach the curation API: ${error.message}`
						: "Could not reach the curation API.",
			});
		}

		const text = await response.text();
		let payload: unknown;

		try {
			payload = text ? JSON.parse(text) : null;
		} catch {
			throw new InvalidApiResponseError(
				`The curation API returned non-JSON data with HTTP ${response.status}.`,
			);
		}

		if (!response.ok) {
			const parsedError = apiErrorResponseSchema.safeParse(payload);

			throw new ApiError({
				status: response.status,
				code: parsedError.success ? parsedError.data.error.code : "api_error",
				message: parsedError.success
					? parsedError.data.error.message
					: `The curation API returned HTTP ${response.status}.`,
			});
		}

		const parsed = schema.safeParse(payload);

		if (!parsed.success) {
			throw new InvalidApiResponseError(
				`The curation API response did not match the expected contract: ${parsed.error.issues[0]?.message ?? "unknown validation error"}`,
			);
		}

		return parsed.data;
	}

	createDraft(input: {
		kind: "interview" | "background_reading";
		expiresInDays: number;
	}) {
		return this.#request("/api/v1/admin/drafts", createDraftResponseSchema, {
			method: "POST",
			body: JSON.stringify(input),
		});
	}

	createShareSnapshot(input: { kind: ShareSnapshotKind; sourceId: string }) {
		return this.#request(
			"/api/v1/admin/share-snapshots",
			createShareSnapshotResponseSchema,
			{
				method: "POST",
				body: JSON.stringify(input),
			},
		);
	}

	revokeShareSnapshot(snapshotId: string) {
		return this.#request(
			`/api/v1/admin/share-snapshots/${encodeURIComponent(snapshotId)}`,
			revokeShareSnapshotResponseSchema,
			{ method: "DELETE" },
		);
	}

	createGuest(input: { name: string; description: string }) {
		return this.#request("/api/v1/admin/guests", createGuestResponseSchema, {
			method: "POST",
			body: JSON.stringify(input),
		});
	}

	listGuests(input: { query?: string; limit: number; cursor?: string }) {
		const search = new URLSearchParams({ limit: String(input.limit) });

		if (input.query) search.set("query", input.query);
		if (input.cursor) search.set("cursor", input.cursor);

		return this.#request(
			`/api/v1/admin/guests?${search}`,
			guestListResponseSchema,
		);
	}

	listInterviews(input: { query?: string; limit: number; cursor?: string }) {
		const search = new URLSearchParams({ limit: String(input.limit) });

		if (input.query) search.set("query", input.query);
		if (input.cursor) search.set("cursor", input.cursor);

		return this.#request(
			`/api/v1/admin/interviews?${search}`,
			interviewListResponseSchema,
		);
	}

	getInterview(interviewId: string) {
		return this.#request(
			`/api/v1/admin/interviews/${encodeURIComponent(interviewId)}`,
			interviewResponseSchema,
		);
	}

	getPublishedPair(publicId: string) {
		return this.#request(
			`/api/v1/interviews/${encodeURIComponent(publicId)}`,
			publicPairResponseSchema,
		);
	}

	attachGuest(interviewId: string, guestId: string) {
		return this.#request(
			`/api/v1/admin/interviews/${encodeURIComponent(interviewId)}/guest`,
			attachGuestResponseSchema,
			{
				method: "PUT",
				body: JSON.stringify({ guestId }),
			},
		);
	}

	publishPair(interviewId: string, backgroundReadingId: string) {
		return this.#request("/api/v1/admin/publish", publishPairResponseSchema, {
			method: "POST",
			body: JSON.stringify({
				scheme: "pair",
				interviewId,
				backgroundReadingId,
			}),
		});
	}
}

export async function collectPages<T>(
	loadPage: (cursor?: string) => Promise<{
		items: T[];
		nextCursor: string | null;
	}>,
) {
	const items: T[] = [];
	const seenCursors = new Set<string>();
	let cursor: string | undefined;

	do {
		const page = await loadPage(cursor);
		items.push(...page.items);

		if (!page.nextCursor) {
			return items;
		}

		if (seenCursors.has(page.nextCursor)) {
			throw new InvalidApiResponseError(
				"The curation API repeated a pagination cursor.",
			);
		}

		seenCursors.add(page.nextCursor);
		cursor = page.nextCursor;
	} while (cursor);

	return items;
}
