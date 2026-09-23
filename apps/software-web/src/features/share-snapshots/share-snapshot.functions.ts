import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { getShareSnapshot } from "./share-snapshot.server";
import {
	getShareSnapshotHeaders,
	SHARE_SNAPSHOT_NOT_FOUND_HEADERS,
} from "./share-snapshot-cache";
import { isValidShareId } from "./share-snapshot-identifiers";
import { compileShareSnapshotForPage } from "./share-snapshot-presentation.server";

function setHeaders(headers: Record<string, string>) {
	for (const [name, value] of Object.entries(headers)) {
		setResponseHeader(name, value);
	}
}

export const getShareSnapshotPage = createServerFn({ method: "GET" })
	.validator((input: unknown) => {
		if (
			typeof input !== "object" ||
			input === null ||
			!("shareId" in input) ||
			!isValidShareId(input.shareId)
		) {
			return { shareId: "" };
		}

		return { shareId: input.shareId };
	})
	.handler(async ({ data }) => {
		if (!data.shareId) {
			setHeaders(SHARE_SNAPSHOT_NOT_FOUND_HEADERS);
			return null;
		}

		const snapshot = await getShareSnapshot(data.shareId);

		if (!snapshot) {
			setHeaders(SHARE_SNAPSHOT_NOT_FOUND_HEADERS);
			return null;
		}

		setHeaders(getShareSnapshotHeaders(snapshot.shareId));
		return compileShareSnapshotForPage(snapshot);
	});
