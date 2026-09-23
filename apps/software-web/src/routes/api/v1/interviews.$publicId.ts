import { createFileRoute } from "@tanstack/react-router";
import { isValidInterviewPublicId } from "../../../features/interviews/interview-public";
import {
	getPublishedInterviewHeaders,
	INTERVIEW_NOT_FOUND_HEADERS,
} from "../../../features/interviews/interview-response";
import { getPublication } from "../../../features/publications/publication.server";
import type { PublicPublicationErrorResponse } from "../../../features/publications/publication.types";

const notFoundResponse = () =>
	Response.json(
		{
			version: "1",
			error: {
				code: "not_found",
				message: "Interview not found.",
			},
		} satisfies PublicPublicationErrorResponse,
		{
			status: 404,
			headers: INTERVIEW_NOT_FOUND_HEADERS,
		},
	);

export const Route = createFileRoute("/api/v1/interviews/$publicId")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				if (!isValidInterviewPublicId(params.publicId)) {
					return notFoundResponse();
				}

				const response = await getPublication(params.publicId);

				if (!response) {
					return notFoundResponse();
				}

				return Response.json(response, {
					headers: getPublishedInterviewHeaders(params.publicId),
				});
			},
		},
	},
});
