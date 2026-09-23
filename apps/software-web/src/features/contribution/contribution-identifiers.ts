export const CONTRIBUTION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const CONTRIBUTION_LINK_ID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeContributionLinkId(linkId: string) {
	return CONTRIBUTION_LINK_ID_PATTERN.test(linkId)
		? linkId.toLowerCase()
		: null;
}
