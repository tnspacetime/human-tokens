import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";
import { z } from "zod";

export class ConfigurationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ConfigurationError";
	}
}

const apiUrlSchema = z
	.string()
	.url()
	.refine((value) => {
		const protocol = new URL(value).protocol;
		return protocol === "http:" || protocol === "https:";
	}, "CURATION_API_URL must use HTTP or HTTPS.")
	.refine((value) => {
		const url = new URL(value);
		return (
			!url.username &&
			!url.password &&
			url.pathname === "/" &&
			!url.search &&
			!url.hash
		);
	}, "CURATION_API_URL must be an origin without a path, query, fragment, or credentials.")
	.transform((value) => new URL(value).origin);

export function loadConfiguration({
	apiUrl,
	envFile,
	cwd = process.cwd(),
}: {
	apiUrl?: string;
	envFile?: string;
	cwd?: string;
}) {
	if (envFile) {
		const path = resolve(cwd, envFile);

		if (!existsSync(path)) {
			throw new ConfigurationError(`Environment file not found: ${path}`);
		}

		const result = loadEnv({ path, override: false, quiet: true });

		if (result.error) {
			throw new ConfigurationError(
				`Could not load environment file: ${result.error.message}`,
			);
		}
	} else {
		for (const filename of [".env.local", ".env"]) {
			const path = resolve(cwd, filename);

			if (existsSync(path)) {
				loadEnv({ path, override: false, quiet: true });
			}
		}
	}

	const parsedApiUrl = apiUrlSchema.safeParse(
		(apiUrl ?? process.env.CURATION_API_URL ?? "http://localhost:3000").trim(),
	);

	if (!parsedApiUrl.success) {
		throw new ConfigurationError(
			parsedApiUrl.error.issues[0]?.message ?? "CURATION_API_URL is invalid.",
		);
	}

	const token = process.env.CURATION_API_TOKEN?.trim();

	if (!token) {
		throw new ConfigurationError(
			"CURATION_API_TOKEN is required. Add it to .env.local or the process environment.",
		);
	}

	return {
		apiUrl: parsedApiUrl.data,
		token,
	};
}
