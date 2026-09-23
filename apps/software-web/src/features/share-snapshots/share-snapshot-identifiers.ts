export const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{22,128}$/;

export function isValidShareId(value: unknown): value is string {
	return typeof value === "string" && SHARE_ID_PATTERN.test(value);
}
