import { createServerFn } from "@tanstack/react-start";
import {
	getCookie,
	getRequest,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { renderMarkdown } from "../../lib/markdown.server";
import { toPublicInterviewMarkdown } from "../interviews/interview-markdown";
import {
	getContributionAuthoringCookieName,
	loadContributionWorkspace,
	resolveContributionLinkAccess,
	saveContribution,
	serializeContributionAuthoringCookie,
} from "./contribution.server";
import {
	CONTRIBUTION_TOKEN_PATTERN,
	normalizeContributionLinkId,
} from "./contribution-identifiers";
import { CONTRIBUTION_RESPONSE_HEADERS } from "./contribution-response";

function setContributionResponseHeaders() {
	for (const [name, value] of Object.entries(CONTRIBUTION_RESPONSE_HEADERS)) {
		setResponseHeader(name, value);
	}
}

function clearContributionCookie(linkId: string) {
	setResponseHeader(
		"Set-Cookie",
		serializeContributionAuthoringCookie({
			linkId,
			rawToken: "",
			maxAge: 0,
		}),
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

function validateContributionLinkInput(value: unknown) {
	if (
		typeof value !== "object" ||
		value === null ||
		Object.keys(value).some((key) => key !== "linkId") ||
		!("linkId" in value) ||
		typeof value.linkId !== "string"
	) {
		throw new Error("The contribution link input is invalid.");
	}

	const linkId = normalizeContributionLinkId(value.linkId);

	if (!linkId) {
		throw new Error("The contribution link input is invalid.");
	}

	return { linkId };
}

function validateOpenContributionInput(value: unknown) {
	if (
		typeof value !== "object" ||
		value === null ||
		Object.keys(value).some((key) => key !== "rawToken") ||
		!("rawToken" in value) ||
		typeof value.rawToken !== "string" ||
		!CONTRIBUTION_TOKEN_PATTERN.test(value.rawToken)
	) {
		throw new Error("The contribution link is invalid.");
	}

	return { rawToken: value.rawToken };
}

export const openContributionLink = createServerFn({ method: "POST" })
	.validator(validateOpenContributionInput)
	.handler(async ({ data }) => {
		setContributionResponseHeaders();
		const access = await resolveContributionLinkAccess(data.rawToken);

		if (!access) {
			return { status: "unavailable" } as const;
		}

		const maxAge = Math.max(
			0,
			Math.floor((access.expiresAt.getTime() - Date.now()) / 1_000),
		);

		setResponseHeader(
			"Set-Cookie",
			serializeContributionAuthoringCookie({
				linkId: access.linkId,
				rawToken: data.rawToken,
				maxAge,
			}),
		);

		return { status: "opened", linkId: access.linkId } as const;
	});

export const getContributionWorkspacePage = createServerFn({ method: "GET" })
	.validator(validateContributionLinkInput)
	.handler(async ({ data }) => {
		setContributionResponseHeaders();

		const rawToken = getCookie(getContributionAuthoringCookieName(data.linkId));

		if (!rawToken) {
			return null;
		}

		const access = await loadContributionWorkspace(rawToken, data.linkId);

		if (!access) {
			clearContributionCookie(data.linkId);
			return null;
		}

		return {
			linkId: access.linkId,
			...access.workspace,
			summaryHtml: await renderMarkdown(access.workspace.summary),
		};
	});

const REVISION_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;

function validateSaveContributionInput(value: unknown): {
	linkId: string;
	contentMarkdown: string;
	revision: string;
	intent: "save" | "submit";
} {
	if (
		typeof value !== "object" ||
		value === null ||
		Object.keys(value).some(
			(key) =>
				key !== "linkId" &&
				key !== "contentMarkdown" &&
				key !== "revision" &&
				key !== "intent",
		) ||
		!("linkId" in value) ||
		typeof value.linkId !== "string" ||
		!("contentMarkdown" in value) ||
		typeof value.contentMarkdown !== "string" ||
		value.contentMarkdown.length > 1_000_000 ||
		!("revision" in value) ||
		typeof value.revision !== "string" ||
		!REVISION_PATTERN.test(value.revision) ||
		!("intent" in value) ||
		(value.intent !== "save" && value.intent !== "submit")
	) {
		throw new Error("The contribution save input is invalid.");
	}

	const linkId = normalizeContributionLinkId(value.linkId);

	if (!linkId) {
		throw new Error("The contribution save input is invalid.");
	}

	return {
		linkId,
		contentMarkdown: value.contentMarkdown,
		revision: value.revision,
		intent: value.intent,
	};
}

function validateContributionPreviewInput(value: unknown): {
	linkId: string;
	contentMarkdown: string;
} {
	if (
		typeof value !== "object" ||
		value === null ||
		Object.keys(value).some(
			(key) => key !== "linkId" && key !== "contentMarkdown",
		) ||
		!("linkId" in value) ||
		typeof value.linkId !== "string" ||
		!("contentMarkdown" in value) ||
		typeof value.contentMarkdown !== "string" ||
		value.contentMarkdown.length > 1_000_000
	) {
		throw new Error("The contribution preview input is invalid.");
	}

	const linkId = normalizeContributionLinkId(value.linkId);

	if (!linkId) {
		throw new Error("The contribution preview input is invalid.");
	}

	return { linkId, contentMarkdown: value.contentMarkdown };
}

export const renderContributionPreview = createServerFn({ method: "POST" })
	.validator(validateContributionPreviewInput)
	.handler(async ({ data }) => {
		setContributionResponseHeaders();

		if (!hasSameOrigin(getRequest())) {
			return { status: "forbidden" } as const;
		}

		const rawToken = getCookie(getContributionAuthoringCookieName(data.linkId));

		if (!rawToken) {
			return { status: "unavailable" } as const;
		}

		const access = await resolveContributionLinkAccess(rawToken, data.linkId);

		if (!access) {
			clearContributionCookie(data.linkId);
			return { status: "unavailable" } as const;
		}

		try {
			return {
				status: "rendered",
				contentHtml: await renderMarkdown(
					toPublicInterviewMarkdown(data.contentMarkdown),
				),
			} as const;
		} catch {
			return { status: "invalid" } as const;
		}
	});

export const saveContributionWorkspace = createServerFn({ method: "POST" })
	.validator(validateSaveContributionInput)
	.handler(async ({ data }) => {
		setContributionResponseHeaders();

		if (!hasSameOrigin(getRequest())) {
			return { status: "forbidden" } as const;
		}

		const rawToken = getCookie(getContributionAuthoringCookieName(data.linkId));

		if (!rawToken) {
			return { status: "unavailable" } as const;
		}

		try {
			const result = await saveContribution({ rawToken, ...data });

			if (result.status === "unavailable") {
				clearContributionCookie(data.linkId);
			}

			return result;
		} catch (error) {
			console.error(
				JSON.stringify({
					message: "Saving a guest contribution failed.",
					error: error instanceof Error ? error.message : "Unknown error",
				}),
			);

			return { status: "error" } as const;
		}
	});
