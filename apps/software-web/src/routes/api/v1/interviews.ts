import { createFileRoute } from "@tanstack/react-router";
import {
	INTERVIEWS_BAD_REQUEST_HEADERS,
	PUBLIC_INTERVIEWS_RESPONSE_HEADERS,
} from "../../../features/interviews/interview-response";
import {
	getPublicInterviews,
	PUBLIC_INTERVIEWS_DEFAULT_LIMIT,
	PUBLIC_INTERVIEWS_MAX_LIMIT,
	parsePublicInterviewsCursor,
} from "../../../features/interviews/interviews.server";
import type { PublicInterviewsErrorResponse } from "../../../features/interviews/interviews.types";

function getLimit(request: Request) {
	const value = new URL(request.url).searchParams.get("limit");
	const parsed = value
		? Number.parseInt(value, 10)
		: PUBLIC_INTERVIEWS_DEFAULT_LIMIT;

	if (!Number.isInteger(parsed) || parsed < 1) {
		return PUBLIC_INTERVIEWS_DEFAULT_LIMIT;
	}

	return Math.min(parsed, PUBLIC_INTERVIEWS_MAX_LIMIT);
}

const invalidCursorResponse = () =>
	Response.json(
		{
			version: "1",
			error: {
				code: "invalid_cursor",
				message: "The interviews cursor is invalid.",
			},
		} satisfies PublicInterviewsErrorResponse,
		{
			status: 400,
			headers: INTERVIEWS_BAD_REQUEST_HEADERS,
		},
	);

export const Route = createFileRoute("/api/v1/interviews")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const cursorValue = url.searchParams.get("cursor");
				const cursor = cursorValue
					? parsePublicInterviewsCursor(cursorValue)
					: null;

				if (cursorValue && !cursor) {
					return invalidCursorResponse();
				}

				return Response.json(
					await getPublicInterviews({
						limit: getLimit(request),
						cursor,
					}),
					{
						headers: PUBLIC_INTERVIEWS_RESPONSE_HEADERS,
					},
				);
			},
		},
	},
});
