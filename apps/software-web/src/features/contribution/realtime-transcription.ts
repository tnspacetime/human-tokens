const TARGET_SAMPLE_RATE = 16_000;
const CONNECTION_TIMEOUT_MS = 10_000;
const FINALIZE_TIMEOUT_MS = 2_000;
const FINAL_RESULT_SETTLE_MS = 250;
const PCM_PROCESSOR_NAME = "human-tokens-pcm-capture";
const PCM_WORKLET_SOURCE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(2048);
    this.offset = 0;
  }

  process(inputs) {
    const input = inputs[0] && inputs[0][0];

    if (!input) {
      return true;
    }

    let inputOffset = 0;

    while (inputOffset < input.length) {
      const available = this.buffer.length - this.offset;
      const length = Math.min(available, input.length - inputOffset);
      this.buffer.set(input.subarray(inputOffset, inputOffset + length), this.offset);
      this.offset += length;
      inputOffset += length;

      if (this.offset === this.buffer.length) {
        this.port.postMessage(this.buffer, [this.buffer.buffer]);
        this.buffer = new Float32Array(2048);
        this.offset = 0;
      }
    }

    return true;
  }
}

registerProcessor("${PCM_PROCESSOR_NAME}", PcmCaptureProcessor);
`;

export type RealtimeTranscriptionSession = {
	stop: () => Promise<string>;
	cancel: () => void;
};

type TranscriptResult = {
	text: string;
	isFinal: boolean;
	fromFinalize: boolean;
};

type PcmCapture = {
	stop: () => Promise<void>;
};

function createTranscriptionUrl(linkId: string) {
	const url = new URL(
		`/api/v1/contribution/${encodeURIComponent(linkId)}/transcribe`,
		window.location.href,
	);
	url.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
	return url;
}

function waitForOpen(socket: WebSocket, signal: AbortSignal) {
	return new Promise<void>((resolve, reject) => {
		if (signal.aborted) {
			socket.close(1000, "cancelled");
			reject(
				new DOMException("The transcription was cancelled.", "AbortError"),
			);
			return;
		}

		const timeout = window.setTimeout(() => {
			cleanup();
			socket.close(1000, "connection-timeout");
			reject(new Error("Opening the transcription connection timed out."));
		}, CONNECTION_TIMEOUT_MS);

		function cleanup() {
			window.clearTimeout(timeout);
			socket.removeEventListener("open", handleOpen);
			socket.removeEventListener("close", handleClose);
			socket.removeEventListener("error", handleError);
			signal.removeEventListener("abort", handleAbort);
		}

		function handleOpen() {
			cleanup();
			resolve();
		}

		function handleClose() {
			cleanup();
			reject(new Error("The transcription connection closed before opening."));
		}

		function handleError() {
			cleanup();
			reject(new Error("The transcription connection could not be opened."));
		}

		function handleAbort() {
			cleanup();
			socket.close(1000, "cancelled");
			reject(
				new DOMException("The transcription was cancelled.", "AbortError"),
			);
		}

		socket.addEventListener("open", handleOpen);
		socket.addEventListener("close", handleClose);
		socket.addEventListener("error", handleError);
		signal.addEventListener("abort", handleAbort, { once: true });
	});
}

function readTranscriptResult(value: unknown): TranscriptResult | null {
	if (typeof value !== "object" || value === null) {
		return null;
	}

	const channel = "channel" in value ? value.channel : null;

	if (typeof channel !== "object" || channel === null) {
		return null;
	}

	const alternatives = "alternatives" in channel ? channel.alternatives : null;

	if (!Array.isArray(alternatives)) {
		return null;
	}

	const alternative = alternatives[0];

	if (
		typeof alternative !== "object" ||
		alternative === null ||
		!("transcript" in alternative) ||
		typeof alternative.transcript !== "string"
	) {
		return null;
	}

	return {
		text: alternative.transcript.trim(),
		isFinal: "is_final" in value && value.is_final === true,
		fromFinalize: "from_finalize" in value && value.from_finalize === true,
	};
}

function resample(input: Float32Array, inputSampleRate: number) {
	if (inputSampleRate === TARGET_SAMPLE_RATE) {
		return input;
	}

	const ratio = inputSampleRate / TARGET_SAMPLE_RATE;
	const outputLength = Math.max(1, Math.floor(input.length / ratio));
	const output = new Float32Array(outputLength);

	for (let index = 0; index < outputLength; index += 1) {
		const start = Math.floor(index * ratio);
		const end = Math.max(
			start + 1,
			Math.min(input.length, Math.floor((index + 1) * ratio)),
		);
		let total = 0;

		for (let inputIndex = start; inputIndex < end; inputIndex += 1) {
			total += input[inputIndex] ?? 0;
		}

		output[index] = total / (end - start);
	}

	return output;
}

function encodeLinear16(input: Float32Array) {
	const data = new ArrayBuffer(input.length * 2);
	const view = new DataView(data);

	for (let index = 0; index < input.length; index += 1) {
		const sample = Math.max(-1, Math.min(1, input[index] ?? 0));
		view.setInt16(
			index * 2,
			sample < 0 ? sample * 0x8000 : sample * 0x7fff,
			true,
		);
	}

	return data;
}

async function createPcmCapture({
	stream,
	socket,
	onError,
}: {
	stream: MediaStream;
	socket: WebSocket;
	onError: (message: string) => void;
}): Promise<PcmCapture> {
	if (typeof AudioContext === "undefined") {
		throw new Error("Realtime audio capture is not supported in this browser.");
	}

	const context = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
	const source = context.createMediaStreamSource(stream);
	const silence = context.createGain();
	silence.gain.value = 0;

	if (!context.audioWorklet) {
		await context.close();
		throw new Error("Realtime audio capture is not supported in this browser.");
	}

	const moduleUrl = URL.createObjectURL(
		new Blob([PCM_WORKLET_SOURCE], { type: "text/javascript" }),
	);

	try {
		await context.audioWorklet.addModule(moduleUrl);
	} catch (error) {
		await context.close();
		throw error;
	} finally {
		URL.revokeObjectURL(moduleUrl);
	}

	let processor: AudioWorkletNode;

	try {
		processor = new AudioWorkletNode(context, PCM_PROCESSOR_NAME);
	} catch (error) {
		await context.close();
		throw error;
	}

	let stopped = false;

	processor.port.onmessage = (event: MessageEvent<unknown>) => {
		if (stopped || !(event.data instanceof Float32Array)) {
			return;
		}

		if (socket.readyState !== WebSocket.OPEN) {
			return;
		}

		try {
			socket.send(encodeLinear16(resample(event.data, context.sampleRate)));
		} catch {
			onError("Sending microphone audio for transcription failed.");
		}
	};

	try {
		source.connect(processor);
		processor.connect(silence);
		silence.connect(context.destination);
		await context.resume();
	} catch (error) {
		source.disconnect();
		processor.disconnect();
		silence.disconnect();
		await context.close();
		throw error;
	}

	return {
		async stop() {
			if (stopped) {
				return;
			}

			stopped = true;
			processor.port.onmessage = null;
			source.disconnect();
			processor.disconnect();
			silence.disconnect();
			await context.close();
		},
	};
}

export async function createRealtimeTranscriptionSession({
	linkId,
	stream,
	signal,
	onTranscript,
	onError,
}: {
	linkId: string;
	stream: MediaStream;
	signal: AbortSignal;
	onTranscript: (transcript: string) => void;
	onError: (message: string) => void;
}): Promise<RealtimeTranscriptionSession> {
	const socket = new WebSocket(createTranscriptionUrl(linkId));
	let capture: PcmCapture | null = null;
	let cancelled = false;
	let stopping = false;
	let settled = false;
	let latestTranscript = "";
	const finalSegments: string[] = [];
	let finishTimer: number | null = null;
	let resolveStop: ((transcript: string) => void) | null = null;
	let rejectStop: ((error: Error) => void) | null = null;

	function clearFinishTimer() {
		if (finishTimer !== null) {
			window.clearTimeout(finishTimer);
			finishTimer = null;
		}
	}

	async function finish() {
		if (settled) {
			return;
		}

		settled = true;
		clearFinishTimer();
		await capture?.stop();
		capture = null;

		if (socket.readyState === WebSocket.OPEN) {
			socket.send(JSON.stringify({ type: "CloseStream" }));
			socket.close(1000, "complete");
		}

		resolveStop?.(latestTranscript.trim());
		resolveStop = null;
		rejectStop = null;
	}

	function scheduleFinish(delay: number) {
		clearFinishTimer();
		finishTimer = window.setTimeout(() => {
			void finish();
		}, delay);
	}

	socket.addEventListener("message", (event) => {
		if (typeof event.data !== "string") {
			return;
		}

		let parsed: unknown;

		try {
			parsed = JSON.parse(event.data);
		} catch {
			return;
		}

		const result = readTranscriptResult(parsed);

		if (!result) {
			return;
		}

		if (result.isFinal && result.text) {
			finalSegments.push(result.text);
		}

		latestTranscript = [...finalSegments, result.isFinal ? "" : result.text]
			.filter(Boolean)
			.join(" ")
			.trim();
		onTranscript(latestTranscript);

		if (stopping && (result.fromFinalize || result.isFinal)) {
			scheduleFinish(result.fromFinalize ? 0 : FINAL_RESULT_SETTLE_MS);
		}
	});

	socket.addEventListener("close", () => {
		if (cancelled || settled) {
			return;
		}

		if (stopping) {
			void finish();
			return;
		}

		void capture?.stop();
		capture = null;
		onError("The live transcription connection closed unexpectedly.");
	});

	socket.addEventListener("error", () => {
		if (!cancelled && !settled) {
			onError("The live transcription connection encountered an error.");
		}
	});

	try {
		await waitForOpen(socket, signal);
		capture = await createPcmCapture({ stream, socket, onError });
	} catch (error) {
		socket.close(1000, "setup-failed");
		await capture?.stop();
		throw error;
	}

	return {
		stop() {
			if (stopping) {
				return Promise.reject(
					new Error("The transcription is already finishing."),
				);
			}

			stopping = true;
			void capture?.stop().catch(() => undefined);
			capture = null;

			return new Promise<string>((resolve, reject) => {
				resolveStop = resolve;
				rejectStop = reject;

				if (socket.readyState !== WebSocket.OPEN) {
					settled = true;
					reject(new Error("The transcription connection is unavailable."));
					resolveStop = null;
					rejectStop = null;
					return;
				}

				try {
					socket.send(JSON.stringify({ type: "Finalize" }));
				} catch {
					settled = true;
					reject(new Error("Finishing the transcript failed."));
					resolveStop = null;
					rejectStop = null;
					return;
				}

				scheduleFinish(FINALIZE_TIMEOUT_MS);
			});
		},
		cancel() {
			if (cancelled) {
				return;
			}

			cancelled = true;
			clearFinishTimer();
			void capture?.stop();
			capture = null;
			if (socket.readyState === WebSocket.OPEN) {
				socket.send(JSON.stringify({ type: "CloseStream" }));
			}
			socket.close(1000, "cancelled");
			rejectStop?.(new Error("The transcription was cancelled."));
			resolveStop = null;
			rejectStop = null;
		},
	};
}
