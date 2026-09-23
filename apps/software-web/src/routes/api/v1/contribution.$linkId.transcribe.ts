import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import {
	getContributionAuthoringCookieName,
	resolveContributionLinkAccess,
	serializeContributionAuthoringCookie,
} from "../../../features/contribution/contribution.server";
import { normalizeContributionLinkId } from "../../../features/contribution/contribution-identifiers";
import { CONTRIBUTION_RESPONSE_HEADERS } from "../../../features/contribution/contribution-response";

type RealtimeAiBinding = {
	run(
		model: string,
		input: Record<string, unknown>,
		options: Record<string, unknown>,
	): Promise<unknown>;
};

function errorResponse(
	status: number,
	code: string,
	message: string,
	additionalHeaders?: Record<string, string>,
) {
	return Response.json(
		{ version: "1", error: { code, message } },
		{
			status,
			headers: {
				...CONTRIBUTION_RESPONSE_HEADERS,
				...additionalHeaders,
			},
		},
	);
}

function hasSameOrigin(request: Request) {
	const origin = request.headers.get("Origin");

	if (!origin) {
		return false;
	}

	try {
		return new URL(origin).origin === new URL(request.url).origin;
	} catch {
		return false;
	}
}

function readCookie(request: Request, name: string) {
	const cookieHeader = request.headers.get("Cookie");

	if (!cookieHeader) {
		return null;
	}

	for (const part of cookieHeader.split(/;\s*/)) {
		const separatorIndex = part.indexOf("=");

		if (separatorIndex !== -1 && part.slice(0, separatorIndex) === name) {
			return part.slice(separatorIndex + 1);
		}
	}

	return null;
}

async function openNova3Connection(ai: RealtimeAiBinding) {
	const result = await ai.run(
		"@cf/deepgram/nova-3",
		{
			encoding: "linear16",
			sample_rate: "16000",
			language: "en",
			interim_results: "true",
			endpointing: "400",
			punctuate: "true",
			smart_format: "true",
		},
		{
			websocket: true,
			tags: ["human-tokens", "guest-contribution"],
		},
	);

	if (!(result instanceof Response)) {
		throw new Error("Workers AI did not return a response.");
	}

	return result;
}

function unavailableResponse(linkId: string | null) {
	return errorResponse(
		401,
		"contribution_unavailable",
		"Contribution access is unavailable.",
		linkId
			? {
					"Set-Cookie": serializeContributionAuthoringCookie({
						linkId,
						rawToken: "",
						maxAge: 0,
					}),
				}
			: undefined,
	);
}

export const Route = createFileRoute("/api/v1/contribution/$linkId/transcribe")(
	{
		server: {
			handlers: {
				GET: async ({ request, params }) => {
					if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
						return errorResponse(
							426,
							"websocket_required",
							"Realtime transcription requires a WebSocket connection.",
						);
					}

					if (!hasSameOrigin(request)) {
						return errorResponse(
							403,
							"origin_mismatch",
							"The request origin is not allowed.",
						);
					}

					const linkId = normalizeContributionLinkId(params.linkId);
					const rawToken = linkId
						? readCookie(request, getContributionAuthoringCookieName(linkId))
						: null;

					if (
						!linkId ||
						!rawToken ||
						!(await resolveContributionLinkAccess(rawToken, linkId))
					) {
						return unavailableResponse(linkId);
					}

					try {
						const response = await openNova3Connection(env.AI);

						if (response.status !== 101 || !response.webSocket) {
							const responseBody = (await response.text()).slice(0, 2_000);

							console.error(
								JSON.stringify({
									message: "Opening a contribution transcription failed.",
									status: response.status,
									responseBody,
								}),
							);

							return errorResponse(
								502,
								"transcription_unavailable",
								"Realtime transcription is temporarily unavailable.",
							);
						}

						return response;
					} catch (error) {
						console.error(
							JSON.stringify({
								message: "Opening a contribution transcription failed.",
								error: error instanceof Error ? error.message : "Unknown error",
							}),
						);

						return errorResponse(
							502,
							"transcription_unavailable",
							"Realtime transcription is temporarily unavailable.",
						);
					}
				},
			},
		},
	},
);
