import { expect, test } from "bun:test";

import { ConfigurationError, loadConfiguration } from "../src/config.js";

test("normalizes an API origin", () => {
	const originalToken = process.env.CURATION_API_TOKEN;
	process.env.CURATION_API_TOKEN = "test-token";

	try {
		expect(loadConfiguration({ apiUrl: "https://example.com/" }).apiUrl).toBe(
			"https://example.com",
		);
	} finally {
		if (originalToken === undefined) {
			delete process.env.CURATION_API_TOKEN;
		} else {
			process.env.CURATION_API_TOKEN = originalToken;
		}
	}
});

test.each([
	"https://example.com/base",
	"https://example.com?environment=production",
	"https://user:password@example.com",
])("rejects a non-origin API URL: %s", (apiUrl) => {
	expect(() => loadConfiguration({ apiUrl })).toThrow(ConfigurationError);
});
