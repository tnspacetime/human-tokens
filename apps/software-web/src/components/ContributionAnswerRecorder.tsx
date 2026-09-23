import {
	CheckIcon,
	CopyIcon,
	MicIcon,
	RotateCcwIcon,
	SquareIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	createRealtimeTranscriptionSession,
	type RealtimeTranscriptionSession,
} from "../features/contribution/realtime-transcription";
import { parseInterviewMarkdownBlocks } from "../features/interviews/interview-markdown";
import type {
	ContributionAnswerRecorderProps,
	ContributionRecordedAnswer,
	ContributionRecorderState,
} from "../lib/types";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "./ui/dialog";

function formatDuration(totalSeconds: number) {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getQuestions(markdown: string) {
	try {
		const questions: Array<{ id: string; text: string }> = [];

		for (const block of parseInterviewMarkdownBlocks(markdown)) {
			if (block.type === "question" && block.text.length > 0) {
				questions.push({ id: block.id, text: block.text });
			}
		}

		return questions;
	} catch {
		return [];
	}
}

export default function ContributionAnswerRecorder({
	linkId,
	markdown,
}: ContributionAnswerRecorderProps) {
	const questions = useMemo(() => getQuestions(markdown), [markdown]);
	const [open, setOpen] = useState(false);
	const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
		questions[0]?.id ?? null,
	);
	const [recorderState, setRecorderState] =
		useState<ContributionRecorderState>("idle");
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const [recordedAnswers, setRecordedAnswers] = useState<
		Record<string, ContributionRecordedAnswer>
	>({});
	const [confirmRecordAgain, setConfirmRecordAgain] = useState(false);
	const [copied, setCopied] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [liveTranscript, setLiveTranscript] = useState("");
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const transcriptionSessionRef = useRef<RealtimeTranscriptionSession | null>(
		null,
	);
	const transcriptionSetupRef = useRef<AbortController | null>(null);
	const pendingTranscriptRef = useRef<Promise<string> | null>(null);
	const liveTranscriptRef = useRef("");
	const recordedAnswersRef = useRef<Record<string, ContributionRecordedAnswer>>(
		{},
	);
	const recordingQuestionIdRef = useRef<string | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const discardOnStopRef = useRef(false);
	const openRef = useRef(false);
	const currentAnswer = selectedQuestionId
		? recordedAnswers[selectedQuestionId]
		: undefined;
	const transcript =
		recorderState === "recording" || recorderState === "finishing"
			? liveTranscript
			: (currentAnswer?.transcript ?? "");

	useEffect(() => {
		if (
			selectedQuestionId === null ||
			!questions.some((question) => question.id === selectedQuestionId)
		) {
			setSelectedQuestionId(questions[0]?.id ?? null);
		}
	}, [questions, selectedQuestionId]);

	useEffect(() => {
		if (recorderState !== "recording") {
			return;
		}

		const interval = window.setInterval(() => {
			setElapsedSeconds((seconds) => seconds + 1);
		}, 1_000);

		return () => window.clearInterval(interval);
	}, [recorderState]);

	useEffect(
		() => () => {
			discardOnStopRef.current = true;
			transcriptionSetupRef.current?.abort();
			transcriptionSessionRef.current?.cancel();
			if (mediaRecorderRef.current?.state === "recording") {
				mediaRecorderRef.current.stop();
			}
			mediaStreamRef.current?.getTracks().forEach((track) => {
				track.stop();
			});
			for (const answer of Object.values(recordedAnswersRef.current)) {
				URL.revokeObjectURL(answer.audioUrl);
			}
		},
		[],
	);

	function releaseMicrophone() {
		mediaStreamRef.current?.getTracks().forEach((track) => {
			track.stop();
		});
		mediaStreamRef.current = null;
	}

	function saveRecordedAnswer(
		questionId: string,
		answer: ContributionRecordedAnswer,
	) {
		const previousAnswer = recordedAnswersRef.current[questionId];

		if (previousAnswer) {
			URL.revokeObjectURL(previousAnswer.audioUrl);
		}

		const nextAnswers = {
			...recordedAnswersRef.current,
			[questionId]: answer,
		};
		recordedAnswersRef.current = nextAnswers;
		setRecordedAnswers(nextAnswers);
	}

	function setCurrentLiveTranscript(transcriptValue: string) {
		liveTranscriptRef.current = transcriptValue;
		setLiveTranscript(transcriptValue);
		setCopied(false);
	}

	function failActiveRecording(message: string) {
		discardOnStopRef.current = true;
		transcriptionSetupRef.current?.abort();
		transcriptionSetupRef.current = null;
		transcriptionSessionRef.current?.cancel();
		transcriptionSessionRef.current = null;
		pendingTranscriptRef.current = null;

		if (mediaRecorderRef.current?.state === "recording") {
			mediaRecorderRef.current.stop();
		}

		releaseMicrophone();
		chunksRef.current = [];
		recordingQuestionIdRef.current = null;
		setCurrentLiveTranscript("");
		setRecorderState("error");
		setErrorMessage(message);
	}

	async function startRecording() {
		setConfirmRecordAgain(false);
		setCopied(false);
		setErrorMessage(null);
		setElapsedSeconds(0);
		setCurrentLiveTranscript("");
		chunksRef.current = [];
		discardOnStopRef.current = false;
		recordingQuestionIdRef.current = selectedQuestionId;

		if (
			typeof MediaRecorder === "undefined" ||
			!navigator.mediaDevices?.getUserMedia
		) {
			setRecorderState("error");
			setErrorMessage("Audio recording is not supported in this browser.");
			return;
		}

		setRecorderState("requesting");
		const setupController = new AbortController();
		transcriptionSetupRef.current = setupController;

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			mediaStreamRef.current = stream;

			if (!openRef.current || setupController.signal.aborted) {
				transcriptionSetupRef.current = null;
				stream.getTracks().forEach((track) => {
					track.stop();
				});
				setRecorderState("idle");
				recordingQuestionIdRef.current = null;
				return;
			}

			const transcriptionSession = await createRealtimeTranscriptionSession({
				linkId,
				stream,
				signal: setupController.signal,
				onTranscript: setCurrentLiveTranscript,
				onError: failActiveRecording,
			});

			if (!openRef.current || setupController.signal.aborted) {
				transcriptionSetupRef.current = null;
				transcriptionSession.cancel();
				releaseMicrophone();
				setRecorderState("idle");
				recordingQuestionIdRef.current = null;
				return;
			}

			transcriptionSetupRef.current = null;
			transcriptionSessionRef.current = transcriptionSession;
			const recorder = new MediaRecorder(stream);

			mediaRecorderRef.current = recorder;
			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					chunksRef.current.push(event.data);
				}
			};
			recorder.onstop = () => {
				void (async () => {
					releaseMicrophone();
					mediaRecorderRef.current = null;
					const recordedQuestionId = recordingQuestionIdRef.current;
					recordingQuestionIdRef.current = null;
					const transcriptPromise = pendingTranscriptRef.current;
					pendingTranscriptRef.current = null;
					transcriptionSessionRef.current = null;

					if (discardOnStopRef.current) {
						chunksRef.current = [];
						return;
					}

					if (!recordedQuestionId) {
						chunksRef.current = [];
						setRecorderState("error");
						setErrorMessage("The question for this recording was unavailable.");
						return;
					}

					let finalTranscript = liveTranscriptRef.current;

					if (transcriptPromise) {
						try {
							finalTranscript = await transcriptPromise;
						} catch {
							chunksRef.current = [];
							setRecorderState("error");
							setErrorMessage(
								"Finishing the transcript failed. Your previous recording was preserved.",
							);
							return;
						}
					}

					const previousAnswer = recordedAnswersRef.current[recordedQuestionId];

					if (!finalTranscript.trim() && previousAnswer) {
						chunksRef.current = [];
						setCurrentLiveTranscript("");
						setRecorderState("error");
						setErrorMessage(
							"No speech was detected. Your previous recording was preserved.",
						);
						return;
					}

					const recording = new Blob(chunksRef.current, {
						type: recorder.mimeType || "audio/webm",
					});
					chunksRef.current = [];
					const nextAudioUrl = URL.createObjectURL(recording);
					saveRecordedAnswer(recordedQuestionId, {
						audioUrl: nextAudioUrl,
						transcript: finalTranscript.trim(),
					});
					setCurrentLiveTranscript("");
					setRecorderState("idle");
					setErrorMessage(
						finalTranscript.trim()
							? null
							: "No speech was detected. You can record this answer again.",
					);
				})();
			};
			recorder.onerror = () => {
				failActiveRecording(
					"Recording stopped unexpectedly. Please try again.",
				);
			};
			recorder.start();
			setRecorderState("recording");
		} catch (error) {
			transcriptionSetupRef.current = null;
			transcriptionSessionRef.current?.cancel();
			transcriptionSessionRef.current = null;
			releaseMicrophone();
			recordingQuestionIdRef.current = null;

			if (
				setupController.signal.aborted ||
				!openRef.current ||
				(error instanceof DOMException && error.name === "AbortError")
			) {
				setRecorderState("idle");
				return;
			}

			setRecorderState("error");
			setErrorMessage(
				error instanceof Error
					? error.message
					: "Microphone access or transcription was not available.",
			);
		}
	}

	function stopRecording() {
		if (mediaRecorderRef.current?.state === "recording") {
			setRecorderState("finishing");
			const transcriptPromise = transcriptionSessionRef.current?.stop();
			pendingTranscriptRef.current =
				transcriptPromise ??
				Promise.reject(new Error("The transcription session is unavailable."));
			void pendingTranscriptRef.current.catch(() => undefined);
			mediaRecorderRef.current.stop();
		}
	}

	function selectQuestion(questionId: string) {
		if (questionId === selectedQuestionId) {
			return;
		}

		setConfirmRecordAgain(false);
		setCopied(false);
		setErrorMessage(null);
		setElapsedSeconds(0);
		setCurrentLiveTranscript("");
		setSelectedQuestionId(questionId);
	}

	function closeDialog(nextOpen: boolean) {
		openRef.current = nextOpen;

		if (!nextOpen && mediaRecorderRef.current?.state === "recording") {
			discardOnStopRef.current = true;
			transcriptionSessionRef.current?.cancel();
			transcriptionSessionRef.current = null;
			mediaRecorderRef.current.stop();
			releaseMicrophone();
		}

		if (!nextOpen) {
			transcriptionSetupRef.current?.abort();
			transcriptionSetupRef.current = null;
			if (recorderState === "requesting") {
				releaseMicrophone();
				recordingQuestionIdRef.current = null;
			}
			setCopied(false);
			setElapsedSeconds(0);
			if (recorderState !== "finishing") {
				setErrorMessage(null);
				setRecorderState("idle");
			}
		}

		setConfirmRecordAgain(false);
		setOpen(nextOpen);
	}

	async function copyTranscript() {
		if (!transcript) {
			return;
		}

		try {
			await navigator.clipboard.writeText(transcript);
			setCopied(true);
		} catch {
			setCopied(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={closeDialog}>
			<DialogTrigger asChild>
				<button
					type="button"
					disabled={questions.length === 0}
					className="inline-flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 border-0 bg-transparent px-4 text-[0.85rem] font-semibold text-[#0071e3] transition-opacity disabled:cursor-default disabled:opacity-35 enabled:hover:opacity-60 md:flex-none"
				>
					<MicIcon className="size-3.5" aria-hidden="true" />
					Record answer
				</button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Record an answer</DialogTitle>
					<DialogDescription>
						Choose the question you want to answer, then start recording.
					</DialogDescription>
				</DialogHeader>

				<fieldset
					disabled={
						recorderState === "recording" ||
						recorderState === "requesting" ||
						recorderState === "finishing"
					}
					className="m-0 grid max-h-56 gap-2 overflow-y-auto border-0 p-0"
				>
					<legend className="mb-3 text-[0.72rem] font-semibold tracking-[0.08em] text-(--sea-ink-soft) uppercase">
						Question
					</legend>
					{questions.map((question, index) => {
						const selected = question.id === selectedQuestionId;
						const hasRecording = Boolean(recordedAnswers[question.id]);

						return (
							<label
								key={question.id}
								className={`flex cursor-pointer items-start gap-3 rounded-2xl px-4 py-3 transition-colors ${
									selected ? "bg-(--surface)" : "hover:bg-(--surface)/60"
								}`}
							>
								<input
									type="radio"
									name="recording-question"
									value={question.id}
									checked={selected}
									onChange={() => selectQuestion(question.id)}
									className="sr-only"
								/>
								<span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-(--surface-strong) text-[#0071e3]">
									{selected ? <CheckIcon className="size-3.5" /> : null}
								</span>
								<span className="min-w-0 flex-1">
									<span className="block text-[0.7rem] font-semibold tracking-[0.06em] text-(--sea-ink-soft) uppercase">
										Question {index + 1}
										{hasRecording ? " · Recorded" : ""}
									</span>
									<span className="mt-1 block text-[0.9rem] leading-5 font-medium">
										{question.text}
									</span>
								</span>
							</label>
						);
					})}
				</fieldset>

				<section className="grid gap-4 rounded-[1.4rem] bg-(--surface) p-4">
					<div className="flex min-h-12 items-center justify-between gap-4">
						<div>
							<p className="m-0 text-[0.88rem] font-semibold">
								{recorderState === "recording"
									? "Recording…"
									: recorderState === "requesting"
										? "Connecting…"
										: recorderState === "finishing"
											? "Finishing transcript…"
											: currentAnswer
												? "Recording ready"
												: "Ready to record"}
							</p>
							<p className="mt-1 mb-0 text-[0.78rem] text-(--sea-ink-soft)">
								{recorderState === "recording"
									? formatDuration(elapsedSeconds)
									: recorderState === "finishing"
										? "Waiting for the final words…"
										: "The recording stays local; audio is streamed for transcription."}
							</p>
						</div>

						{recorderState === "recording" ? (
							<button
								type="button"
								onClick={stopRecording}
								className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-[#ff3b30] px-5 text-[0.84rem] font-semibold text-white transition-opacity hover:opacity-80"
							>
								<SquareIcon className="size-3 fill-current" />
								Stop
							</button>
						) : recorderState === "requesting" ||
							recorderState === "finishing" ? (
							<button
								type="button"
								disabled
								className="inline-flex min-h-10 items-center justify-center rounded-full border-0 bg-(--sea-ink) px-5 text-[0.84rem] font-semibold text-(--bg-base) opacity-35"
							>
								{recorderState === "requesting" ? "Preparing…" : "Finishing…"}
							</button>
						) : currentAnswer ? (
							<button
								type="button"
								onClick={() => setConfirmRecordAgain(true)}
								className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-(--surface-strong) px-5 text-[0.84rem] font-semibold text-[#0071e3] transition-opacity hover:opacity-70"
							>
								<RotateCcwIcon className="size-3.5" />
								Record again
							</button>
						) : (
							<button
								type="button"
								onClick={() => void startRecording()}
								disabled={selectedQuestionId === null}
								className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-(--sea-ink) px-5 text-[0.84rem] font-semibold text-(--bg-base) transition-opacity disabled:cursor-default disabled:opacity-35 enabled:hover:opacity-80"
							>
								<MicIcon className="size-3.5" />
								Record
							</button>
						)}
					</div>

					{currentAnswer ? (
						// biome-ignore lint/a11y/useMediaCaption: This is the guest's private source recording; its transcript is presented directly below.
						<audio
							controls
							src={currentAnswer.audioUrl}
							className="h-10 w-full"
						/>
					) : null}

					{confirmRecordAgain ? (
						<div className="rounded-2xl bg-(--surface-strong) p-4">
							<p className="m-0 text-[0.83rem] leading-5">
								Recording again replaces the temporary recording and transcript
								for this question. Other questions and the editor are not
								changed.
							</p>
							<div className="mt-3 flex justify-end gap-4">
								<button
									type="button"
									onClick={() => setConfirmRecordAgain(false)}
									className="cursor-pointer border-0 bg-transparent p-0 text-[0.82rem] font-semibold text-(--sea-ink-soft)"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={() => void startRecording()}
									className="cursor-pointer border-0 bg-transparent p-0 text-[0.82rem] font-semibold text-[#0071e3]"
								>
									Record again
								</button>
							</div>
						</div>
					) : null}
				</section>

				<section>
					<div className="mb-2 flex items-center justify-between gap-4">
						<h2 className="m-0 text-[0.8rem] font-semibold">Transcript</h2>
						<button
							type="button"
							onClick={() => void copyTranscript()}
							disabled={!transcript}
							className="inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-[0.8rem] font-semibold text-[#0071e3] disabled:cursor-default disabled:opacity-35"
						>
							{copied ? (
								<CheckIcon className="size-3.5" />
							) : (
								<CopyIcon className="size-3.5" />
							)}
							{copied ? "Copied" : "Copy text"}
						</button>
					</div>
					<div className="min-h-32 rounded-[1.25rem] bg-(--surface) p-4 text-[0.9rem] leading-6 text-(--sea-ink-soft)">
						{transcript ||
							(recorderState === "requesting"
								? "Connecting to live transcription…"
								: recorderState === "recording" || recorderState === "finishing"
									? "Listening…"
									: "Record an answer to generate a transcript.")}
					</div>
				</section>
				{errorMessage ? (
					<p className="m-0 text-[0.82rem] text-red-600" role="alert">
						{errorMessage}
					</p>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
