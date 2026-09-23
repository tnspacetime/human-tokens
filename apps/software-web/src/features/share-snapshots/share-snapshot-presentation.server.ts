import { renderMarkdown } from "../../lib/markdown.server";
import { toPublicInterviewMarkdown } from "../interviews/interview-markdown";
import type {
	ShareSnapshotContent,
	ShareSnapshotPage,
} from "./share-snapshot.types";

export async function compileShareSnapshotForPage(
	snapshot: ShareSnapshotContent,
): Promise<ShareSnapshotPage> {
	const [summaryHtml, contentHtml] = await Promise.all([
		renderMarkdown(snapshot.summary),
		renderMarkdown(
			snapshot.kind === "interview"
				? toPublicInterviewMarkdown(snapshot.contentMarkdown)
				: snapshot.contentMarkdown,
		),
	]);

	if (snapshot.kind === "background_reading") {
		return {
			kind: snapshot.kind,
			shareId: snapshot.shareId,
			title: snapshot.title,
			summary: snapshot.summary,
			summaryHtml,
			contentHtml,
		};
	}

	return {
		kind: snapshot.kind,
		shareId: snapshot.shareId,
		title: snapshot.title,
		summary: snapshot.summary,
		summaryHtml,
		contentHtml,
		guestName: snapshot.guestName,
		guestDescription: snapshot.guestDescription,
		portraitUrl: snapshot.portraitUrl,
	};
}
