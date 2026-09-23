import { describe, expect, test } from "bun:test";

import {
	ApiError,
	CurationApiClient,
	collectPages,
	InvalidApiResponseError,
} from "../src/api-client.js";

const GUEST_ID = "8da4c91a-c7ac-4f73-88f1-7e7e9de6530c";
const INTERVIEW_ID = "d8d7786d-b6ba-4438-9ea8-dda75aa7e94c";
const BACKGROUND_READING_ID = "5a7d9cd6-1d71-449f-bf9c-7064c7863380";

function fetcher(
	handler: (request: Request) => Response | Promise<Response>,
): typeof fetch {
	return ((input: URL | RequestInfo, init?: RequestInit) => {
		return handler(new Request(input, init));
	}) as typeof fetch;
}

describe("CurationApiClient", () => {
	test("authenticates and validates guest creation", async () => {
		let capturedRequest: Request | undefined;
		const client = new CurationApiClient({
			baseUrl: "https://example.com/",
			token: "secret-token",
			fetcher: fetcher((request) => {
				capturedRequest = request;
				return Response.json(
					{
						version: "1",
						item: {
							id: GUEST_ID,
							name: "Ada Lovelace",
							description: "Mathematician and writer",
						},
					},
					{ status: 201 },
				);
			}),
		});

		const response = await client.createGuest({
			name: "Ada Lovelace",
			description: "Mathematician and writer",
		});

		expect(response.item.id).toBe(GUEST_ID);
		expect(capturedRequest?.url).toBe(
			"https://example.com/api/v1/admin/guests",
		);
		expect(capturedRequest?.method).toBe("POST");
		expect(capturedRequest?.headers.get("Authorization")).toBe(
			"Bearer secret-token",
		);
		expect(await capturedRequest?.json()).toEqual({
			name: "Ada Lovelace",
			description: "Mathematician and writer",
		});
	});

	test("surfaces structured API errors", async () => {
		const client = new CurationApiClient({
			baseUrl: "https://example.com",
			token: "wrong-token",
			fetcher: fetcher(() =>
				Response.json(
					{
						version: "1",
						error: { code: "unauthorized", message: "Unauthorized." },
					},
					{ status: 401 },
				),
			),
		});

		const error = await client
			.listGuests({ limit: 100 })
			.catch((value: unknown) => value);

		expect(error).toBeInstanceOf(ApiError);
		expect(error).toMatchObject({
			status: 401,
			code: "unauthorized",
			message: "Unauthorized.",
		});
	});

	test("publishes a pair with the named scheme", async () => {
		let capturedRequest: Request | undefined;
		const client = new CurationApiClient({
			baseUrl: "https://example.com",
			token: "secret-token",
			fetcher: fetcher((request) => {
				capturedRequest = request;
				return Response.json({
					version: "1",
					item: {
						publicId: "ada-on-computing",
						publicationDate: "2026-09-09",
						guest: {
							id: GUEST_ID,
							name: "Ada Lovelace",
							description: "Mathematician and writer",
						},
						interview: {
							title: "Computing",
							summary: "A conversation about computing.",
							contentMarkdown: "# Computing",
							portraitUrl: null,
						},
						backgroundReading: {
							title: "Notes on computing",
							summary: "Background notes.",
							contentMarkdown: "# Notes",
						},
					},
				});
			}),
		});

		const response = await client.publishPair(
			INTERVIEW_ID,
			BACKGROUND_READING_ID,
		);

		expect(response.item.publicId).toBe("ada-on-computing");
		expect(capturedRequest?.url).toBe(
			"https://example.com/api/v1/admin/publish",
		);
		expect(capturedRequest?.method).toBe("POST");
		expect(await capturedRequest?.json()).toEqual({
			scheme: "pair",
			interviewId: INTERVIEW_ID,
			backgroundReadingId: BACKGROUND_READING_ID,
		});
	});

	test("creates a share snapshot for one source", async () => {
		let capturedRequest: Request | undefined;
		const snapshotId = "378d2923-6619-4625-a72d-3d9c556cd028";
		const client = new CurationApiClient({
			baseUrl: "https://example.com",
			token: "secret-token",
			fetcher: fetcher((request) => {
				capturedRequest = request;
				return Response.json(
					{
						version: "1",
						snapshotId,
						kind: "background_reading",
						shareUrl: "https://example.com/share/AAABBBCCCDDDEEEFFFGGGH",
						createdAt: "2026-09-14T17:00:00.000Z",
					},
					{ status: 201 },
				);
			}),
		});

		const response = await client.createShareSnapshot({
			kind: "background_reading",
			sourceId: BACKGROUND_READING_ID,
		});

		expect(response.snapshotId).toBe(snapshotId);
		expect(capturedRequest?.url).toBe(
			"https://example.com/api/v1/admin/share-snapshots",
		);
		expect(capturedRequest?.method).toBe("POST");
		expect(await capturedRequest?.json()).toEqual({
			kind: "background_reading",
			sourceId: BACKGROUND_READING_ID,
		});
	});

	test("revokes a share snapshot by ID", async () => {
		let capturedRequest: Request | undefined;
		const snapshotId = "378d2923-6619-4625-a72d-3d9c556cd028";
		const client = new CurationApiClient({
			baseUrl: "https://example.com",
			token: "secret-token",
			fetcher: fetcher((request) => {
				capturedRequest = request;
				return Response.json({
					version: "1",
					status: "revoked",
					revokedAt: "2026-09-14T17:05:00.000Z",
				});
			}),
		});

		const response = await client.revokeShareSnapshot(snapshotId);

		expect(response.status).toBe("revoked");
		expect(capturedRequest?.url).toBe(
			`https://example.com/api/v1/admin/share-snapshots/${snapshotId}`,
		);
		expect(capturedRequest?.method).toBe("DELETE");
		expect(capturedRequest?.headers.get("Authorization")).toBe(
			"Bearer secret-token",
		);
	});

	test("loads a published pair by public ID", async () => {
		let capturedRequest: Request | undefined;
		const client = new CurationApiClient({
			baseUrl: "https://example.com",
			token: "secret-token",
			fetcher: fetcher((request) => {
				capturedRequest = request;
				return Response.json({
					version: "1",
					item: {
						publicId: "G1uhwZEP34SWonzlB3KAWQ",
						publicationDate: "2026-09-09",
						guest: {
							id: GUEST_ID,
							name: "Ada Lovelace",
							description: "Mathematician and writer",
						},
						interview: {
							title: "Computing",
							summary: "A conversation about computing.",
							contentMarkdown: "# Computing",
							portraitUrl: null,
						},
						backgroundReading: {
							title: "Notes on computing",
							summary: "Background notes.",
							contentMarkdown: "# Notes",
						},
					},
				});
			}),
		});

		const response = await client.getPublishedPair("G1uhwZEP34SWonzlB3KAWQ");

		expect(response.item.interview.title).toBe("Computing");
		expect(capturedRequest?.url).toBe(
			"https://example.com/api/v1/interviews/G1uhwZEP34SWonzlB3KAWQ",
		);
		expect(capturedRequest?.method).toBe("GET");
	});

	test("rejects successful responses that violate the contract", async () => {
		const client = new CurationApiClient({
			baseUrl: "https://example.com",
			token: "secret-token",
			fetcher: fetcher(() =>
				Response.json({ version: "1", items: "not-an-array" }),
			),
		});

		const error = await client
			.listGuests({ limit: 100 })
			.catch((value: unknown) => value);

		expect(error).toBeInstanceOf(InvalidApiResponseError);
	});

	test("times out requests with a stable API error code", async () => {
		const client = new CurationApiClient({
			baseUrl: "https://example.com",
			token: "secret-token",
			timeoutMs: 1,
			fetcher: fetcher(
				(request) =>
					new Promise((_resolve, reject) => {
						request.signal.addEventListener("abort", () => {
							reject(request.signal.reason);
						});
					}),
			),
		});

		const error = await client
			.listGuests({ limit: 100 })
			.catch((value: unknown) => value);

		expect(error).toMatchObject({
			status: 0,
			code: "request_timeout",
		});
	});
});

describe("collectPages", () => {
	test("follows cursors until every page is collected", async () => {
		const cursors: Array<string | undefined> = [];
		const items = await collectPages(async (cursor) => {
			cursors.push(cursor);

			if (!cursor) return { items: [1, 2], nextCursor: "page-2" };
			return { items: [3], nextCursor: null };
		});

		expect(items).toEqual([1, 2, 3]);
		expect(cursors).toEqual([undefined, "page-2"]);
	});

	test("rejects a repeated cursor", async () => {
		const error = await collectPages(async () => ({
			items: [],
			nextCursor: "same-cursor",
		})).catch((value: unknown) => value);

		expect(error).toBeInstanceOf(InvalidApiResponseError);
	});
});
