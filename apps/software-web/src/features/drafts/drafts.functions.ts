import { createServerFn } from "@tanstack/react-start";
import {
	getCookie,
	getRequest,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { renderMarkdown } from "../../lib/markdown.server";
import { DRAFT_TOKEN_PATTERN, normalizeDraftLinkId } from "./draft-identifiers";
import { DRAFT_RESPONSE_HEADERS } from "./draft-response";
import type { DraftSaveIntent, SaveInterviewDraftInput } from "./drafts.server";
import {
	createInterviewContributionLink,
	getDraftAuthoringCookieName,
	loadDraftWorkspace,
	resolveDraftLink,
	saveBackgroundReadingDraft,
	saveInterviewDraft,
	serializeDraftAuthoringCookie,
} from "./drafts.server";

const REVISION_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;

type SaveInterviewDraftWorkspaceInput = Omit<
	SaveInterviewDraftInput,
	"rawToken"
>;

type BackgroundReadingPreviewInput = {
	linkId: string;
	title: string;
	summary: string;
	contentMarkdown: string;
};

const MAX_PREVIEW_TITLE_LENGTH = 10_000;
const MAX_PREVIEW_MARKDOWN_LENGTH = 1_000_000;

function setDraftResponseHeaders() {
	for (const [name, value] of Object.entries(DRAFT_RESPONSE_HEADERS)) {
		setResponseHeader(name, value);
	}
}

function clearDraftCookie(linkId: string) {
	setResponseHeader(
		"Set-Cookie",
		serializeDraftAuthoringCookie({
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

function isSaveIntent(value: unknown): value is DraftSaveIntent {
	return value === "save" || value === "finalize" || value === "unfinalize";
}

function validateDraftLinkInput(value: unknown) {
	if (
		typeof value !== "object" ||
		value === null ||
		Object.keys(value).some((key) => key !== "linkId") ||
		!("linkId" in value) ||
		typeof value.linkId !== "string"
	) {
		throw new Error("The draft link input is invalid.");
	}

	const linkId = normalizeDraftLinkId(value.linkId);

	if (!linkId) {
		throw new Error("The draft link input is invalid.");
	}

	return { linkId };
}

function validateOpenDraftInput(value: unknown) {
	if (
		typeof value !== "object" ||
		value === null ||
		Object.keys(value).some((key) => key !== "rawToken") ||
		!("rawToken" in value) ||
		typeof value.rawToken !== "string" ||
		!DRAFT_TOKEN_PATTERN.test(value.rawToken)
	) {
		throw new Error("The draft link is invalid.");
	}

	return { rawToken: value.rawToken };
}

function validateSaveDraftWorkspaceInput(
	value: unknown,
): SaveInterviewDraftWorkspaceInput {
	if (
		typeof value !== "object" ||
		value === null ||
		Object.keys(value).some(
			(key) =>
				key !== "linkId" &&
				key !== "title" &&
				key !== "summary" &&
				key !== "contentMarkdown" &&
				key !== "revision" &&
				key !== "intent",
		) ||
		!("linkId" in value) ||
		typeof value.linkId !== "string" ||
		!("title" in value) ||
		typeof value.title !== "string" ||
		!("summary" in value) ||
		typeof value.summary !== "string" ||
		!("contentMarkdown" in value) ||
		typeof value.contentMarkdown !== "string" ||
		!("revision" in value) ||
		typeof value.revision !== "string" ||
		!REVISION_PATTERN.test(value.revision) ||
		!("intent" in value) ||
		!isSaveIntent(value.intent)
	) {
		throw new Error("The draft save input is invalid.");
	}

	const linkId = normalizeDraftLinkId(value.linkId);

	if (!linkId) {
		throw new Error("The draft save input is invalid.");
	}

	return {
		linkId,
		title: value.title,
		summary: value.summary,
		contentMarkdown: value.contentMarkdown,
		revision: value.revision,
		intent: value.intent,
	};
}

function validateBackgroundReadingPreviewInput(
	value: unknown,
): BackgroundReadingPreviewInput {
	if (
		typeof value !== "object" ||
		value === null ||
		Object.keys(value).some(
			(key) =>
				key !== "linkId" &&
				key !== "title" &&
				key !== "summary" &&
				key !== "contentMarkdown",
		) ||
		!("linkId" in value) ||
		typeof value.linkId !== "string" ||
		!("title" in value) ||
		typeof value.title !== "string" ||
		value.title.length > MAX_PREVIEW_TITLE_LENGTH ||
		!("summary" in value) ||
		typeof value.summary !== "string" ||
		value.summary.length > MAX_PREVIEW_MARKDOWN_LENGTH ||
		!("contentMarkdown" in value) ||
		typeof value.contentMarkdown !== "string" ||
		value.contentMarkdown.length > MAX_PREVIEW_MARKDOWN_LENGTH
	) {
		throw new Error("The background-reading preview input is invalid.");
	}

	const linkId = normalizeDraftLinkId(value.linkId);

	if (!linkId) {
		throw new Error("The background-reading preview input is invalid.");
	}

	return {
		linkId,
		title: value.title,
		summary: value.summary,
		contentMarkdown: value.contentMarkdown,
	};
}

export const openDraftLink = createServerFn({ method: "POST" })
	.validator(validateOpenDraftInput)
	.handler(async ({ data }) => {
		setDraftResponseHeaders();
		const access = await resolveDraftLink(data.rawToken);

		if (!access) {
			return { status: "unavailable" } as const;
		}

		const maxAge = Math.max(
			0,
			Math.floor((access.expiresAt.getTime() - Date.now()) / 1_000),
		);

		setResponseHeader(
			"Set-Cookie",
			serializeDraftAuthoringCookie({
				linkId: access.linkId,
				rawToken: data.rawToken,
				maxAge,
			}),
		);

		return {
			status: "opened",
			kind: access.kind,
			linkId: access.linkId,
		} as const;
	});

export const getDraftWorkspace = createServerFn({ method: "GET" })
	.validator(validateDraftLinkInput)
	.handler(async ({ data }) => {
		setDraftResponseHeaders();
		const rawToken = getCookie(getDraftAuthoringCookieName(data.linkId));

		if (!rawToken) {
			return null;
		}

		const workspace = await loadDraftWorkspace({
			linkId: data.linkId,
			rawToken,
		});

		if (!workspace) {
			clearDraftCookie(data.linkId);
		}

		return workspace;
	});

export const renderBackgroundReadingDraftPreview = createServerFn({
	method: "POST",
})
	.validator(validateBackgroundReadingPreviewInput)
	.handler(async ({ data }) => {
		setDraftResponseHeaders();

		if (!hasSameOrigin(getRequest())) {
			return { status: "forbidden" } as const;
		}

		const rawToken = getCookie(getDraftAuthoringCookieName(data.linkId));

		if (!rawToken) {
			return { status: "unavailable" } as const;
		}

		const access = await resolveDraftLink(rawToken, data.linkId);

		if (!access || access.kind !== "background_reading") {
			clearDraftCookie(data.linkId);
			return { status: "unavailable" } as const;
		}

		try {
			const [summaryHtml, contentHtml] = await Promise.all([
				renderMarkdown(data.summary),
				renderMarkdown(data.contentMarkdown),
			]);

			return {
				status: "rendered",
				preview: {
					title: data.title,
					summaryHtml,
					contentHtml,
				},
			} as const;
		} catch (error) {
			console.error(
				JSON.stringify({
					message: "Rendering a background-reading preview failed.",
					error: error instanceof Error ? error.message : "Unknown error",
				}),
			);

			return { status: "error" } as const;
		}
	});

export const saveInterviewDraftWorkspace = createServerFn({ method: "POST" })
	.validator(validateSaveDraftWorkspaceInput)
	.handler(async ({ data }) => {
		setDraftResponseHeaders();

		if (!hasSameOrigin(getRequest())) {
			return { status: "forbidden" } as const;
		}

		const rawToken = getCookie(getDraftAuthoringCookieName(data.linkId));

		if (!rawToken) {
			return { status: "unavailable" } as const;
		}

		try {
			const result = await saveInterviewDraft({ rawToken, ...data });

			if (result.status === "unavailable") {
				clearDraftCookie(data.linkId);
			}

			return result;
		} catch (error) {
			console.error(
				JSON.stringify({
					message: "Saving an interview draft failed.",
					error: error instanceof Error ? error.message : "Unknown error",
				}),
			);

			return { status: "error" } as const;
		}
	});

export const saveBackgroundReadingDraftWorkspace = createServerFn({
	method: "POST",
})
	.validator(validateSaveDraftWorkspaceInput)
	.handler(async ({ data }) => {
		setDraftResponseHeaders();

		if (!hasSameOrigin(getRequest())) {
			return { status: "forbidden" } as const;
		}

		const rawToken = getCookie(getDraftAuthoringCookieName(data.linkId));

		if (!rawToken) {
			return { status: "unavailable" } as const;
		}

		try {
			const result = await saveBackgroundReadingDraft({ rawToken, ...data });

			if (result.status === "unavailable") {
				clearDraftCookie(data.linkId);
			}

			return result;
		} catch (error) {
			console.error(
				JSON.stringify({
					message: "Saving a background-reading draft failed.",
					error: error instanceof Error ? error.message : "Unknown error",
				}),
			);

			return { status: "error" } as const;
		}
	});

export const createInterviewContributionLinkForDraft = createServerFn({
	method: "POST",
})
	.validator(validateDraftLinkInput)
	.handler(async ({ data }) => {
		setDraftResponseHeaders();
		const request = getRequest();

		if (!hasSameOrigin(request)) {
			return { status: "forbidden" } as const;
		}

		const rawToken = getCookie(getDraftAuthoringCookieName(data.linkId));

		if (!rawToken) {
			return { status: "unavailable" } as const;
		}

		try {
			const result = await createInterviewContributionLink({
				linkId: data.linkId,
				rawToken,
			});

			if (result.status === "unavailable") {
				clearDraftCookie(data.linkId);
				return result;
			}

			return {
				status: "created",
				link: {
					url: new URL(
						`/contribute/${result.rawToken}`,
						request.url,
					).toString(),
					expiresAt: result.expiresAt.toISOString(),
				},
			} as const;
		} catch (error) {
			console.error(
				JSON.stringify({
					message: "Creating an interview contribution link failed.",
					error: error instanceof Error ? error.message : "Unknown error",
				}),
			);

			return { status: "error" } as const;
		}
	});
