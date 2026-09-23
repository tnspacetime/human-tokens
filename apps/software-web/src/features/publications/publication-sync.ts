const DEFAULT_RETRY_DELAYS_MS = [250, 1_000, 3_000] as const;

type RunPostCommitPublicationSyncInput = {
	operation: () => Promise<void>;
	schedule: (task: Promise<void>) => void;
	onFailure: (error: unknown) => void;
	retryDelaysMs?: readonly number[];
	wait?: (delayMs: number) => Promise<void>;
};

function waitFor(delayMs: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, delayMs));
}

async function retryPublishedSync({
	operation,
	retryDelaysMs,
	wait,
	initialError,
}: {
	operation: () => Promise<void>;
	retryDelaysMs: readonly number[];
	wait: (delayMs: number) => Promise<void>;
	initialError: unknown;
}) {
	let lastError = initialError;

	for (const delayMs of retryDelaysMs) {
		await wait(delayMs);

		try {
			await operation();
			return;
		} catch (error) {
			lastError = error;
		}
	}

	throw lastError;
}

export async function runPostCommitPublicationSync({
	operation,
	schedule,
	onFailure,
	retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
	wait = waitFor,
}: RunPostCommitPublicationSyncInput) {
	try {
		await operation();
		return;
	} catch (initialError) {
		const retryTask = retryPublishedSync({
			operation,
			retryDelaysMs,
			wait,
			initialError,
		}).catch(onFailure);

		try {
			schedule(retryTask);
		} catch (error) {
			onFailure(error);
		}
	}
}
