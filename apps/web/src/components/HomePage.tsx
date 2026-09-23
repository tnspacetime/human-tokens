import { MessageSquareQuote } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import PageContainer from "./PageContainer";

const ease = [0.22, 1, 0.36, 1] as const;

function InterviewCard({ reducedMotion }: { reducedMotion: boolean }) {
	return (
		<motion.article
			className="w-full max-w-[20rem] overflow-hidden rounded-[2rem] bg-white text-[#1d1d1f] dark:bg-[#2c2c2e] dark:text-[#f5f5f7]"
			initial={
				reducedMotion
					? false
					: { opacity: 0, y: 30, scale: 0.975, filter: "blur(5px)" }
			}
			animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
			transition={
				reducedMotion
					? { duration: 0 }
					: {
							y: {
								type: "spring",
								stiffness: 105,
								damping: 20,
								mass: 0.85,
								delay: 0.3,
							},
							scale: {
								type: "spring",
								stiffness: 120,
								damping: 21,
								mass: 0.8,
								delay: 0.3,
							},
							opacity: { duration: 0.55, ease, delay: 0.3 },
							filter: { duration: 0.6, ease, delay: 0.3 },
						}
			}
		>
			<div className="flex h-full flex-col">
				<div className="flex h-40 items-center justify-center" aria-hidden="true">
					<MessageSquareQuote size={54} strokeWidth={1.65} />
				</div>
				{/* Same vertical structure as software-web cards so height matches. */}
				<div className="flex min-h-0 flex-1 flex-col p-[clamp(1.5rem,3vw,2rem)] text-center">
					<p
						className="m-0 text-[0.68rem] leading-none font-semibold tracking-[0.06em] text-transparent uppercase select-none"
						aria-hidden="true"
					>
						Today&apos;s interview
					</p>
					<h2 className="mt-[0.65rem] mb-0 flex min-h-[calc(1.2rem*1.12*3)] max-w-[13rem] items-center justify-center self-center text-[1.2rem] leading-[1.12] font-semibold tracking-[-0.035em]">
						One interview
					</h2>
					<div className="mt-10 flex flex-col items-center" aria-hidden="true">
						<span className="inline-flex size-12" />
						<span className="mt-[0.5rem] text-[0.78rem] leading-none font-medium text-transparent">
							Read
						</span>
					</div>
				</div>
			</div>
		</motion.article>
	);
}

function TypingLine({
	segments,
	delay,
	reducedMotion,
}: {
	segments: Array<{ text: string; className?: string }>;
	delay: number;
	reducedMotion: boolean;
}) {
	return (
		<p className="m-0 whitespace-pre">
			{segments.flatMap((segment, segmentIndex) => {
				const charactersBeforeSegment = segments
					.slice(0, segmentIndex)
					.reduce((total, item) => total + item.text.length, 0);

				return Array.from(segment.text).map((character, characterIndex) => {
					const characterDelay =
						delay + (charactersBeforeSegment + characterIndex) * 0.045;
					const revealAt = characterDelay / 10;

					return (
						<motion.span
							key={`${segmentIndex}-${characterIndex}`}
							className={segment.className}
							initial={reducedMotion ? false : { opacity: 0 }}
							animate={
								reducedMotion ? { opacity: 1 } : { opacity: [0, 0, 1, 1, 0] }
							}
							transition={
								reducedMotion
									? { duration: 0 }
									: {
											duration: 10,
											times: [0, revealAt, revealAt + 0.001, 0.9, 0.91],
											repeat: Infinity,
											ease: "linear",
										}
							}
						>
							{character}
						</motion.span>
					);
				});
			})}
		</p>
	);
}

function SimplifiedEditorGraphic({
	reducedMotion,
}: {
	reducedMotion: boolean;
}) {
	return (
		<div className="flex h-40 flex-col bg-[#1C1B1A]" aria-hidden="true">
			<div className="flex h-8 shrink-0 items-center px-3 text-white">
				<div className="flex gap-1.5">
					<span className="size-2 rounded-full bg-[#df4b35]" />
					<span className="size-2 rounded-full bg-[#e4ad32]" />
					<span className="size-2 rounded-full bg-[#4f8468]" />
				</div>
				<span className="mx-auto pr-6 font-mono text-[0.52rem] font-bold tracking-[0.1em] uppercase">
					notes.md
				</span>
			</div>

			<div className="grid min-h-0 flex-1 grid-cols-[2rem_1fr]">
				<div className="flex flex-col items-end gap-2 px-2 pt-3 font-mono text-[0.42rem] leading-none text-white/70">
					<span>01</span>
					<span>02</span>
					<span>03</span>
					<span>04</span>
				</div>
				<div className="overflow-hidden px-3 pt-3 font-mono text-[0.54rem] leading-[1.65] text-[#EDE9E2]">
					<TypingLine
						segments={[
							{ text: "# Quiet systems", className: "font-bold text-white" },
						]}
						delay={0.2}
						reducedMotion={reducedMotion}
					/>
					<TypingLine
						segments={[
							{
								text: "Latency is what people feel.",
								className: "text-[#EDE9E2]/80",
							},
						]}
						delay={1.15}
						reducedMotion={reducedMotion}
					/>
					<TypingLine
						segments={[
							{ text: "- Measure the tail", className: "text-[#EDE9E2]/80" },
						]}
						delay={2.35}
						reducedMotion={reducedMotion}
					/>
					<TypingLine
						segments={[
							{ text: "- Retry with patience", className: "text-[#EDE9E2]/80" },
						]}
						delay={3.65}
						reducedMotion={reducedMotion}
					/>
					<motion.p
						className="m-0 text-white"
						initial={reducedMotion ? false : { opacity: 0 }}
						animate={
							reducedMotion
								? { opacity: 1 }
								: { opacity: [0, 0, 1, 0, 1, 0, 1, 0, 1, 0] }
						}
						transition={
							reducedMotion
								? { duration: 0 }
								: {
										duration: 10,
										times: [
											0, 0.49, 0.5, 0.57, 0.64, 0.71, 0.78, 0.85, 0.89, 0.9,
										],
										repeat: Infinity,
										ease: "linear",
									}
						}
					>
						▌
					</motion.p>
				</div>
			</div>

			<div className="flex h-5 shrink-0 items-center justify-between px-3 font-mono text-[0.38rem] font-bold tracking-[0.08em] text-white/75 uppercase">
				<span>Markdown</span>
				<span>Ready</span>
			</div>
		</div>
	);
}

function BackgroundReadingCard({ reducedMotion }: { reducedMotion: boolean }) {
	return (
		<motion.article
			className="w-full max-w-[20rem] overflow-hidden rounded-[2rem] bg-white text-[#1d1d1f] dark:bg-[#2c2c2e] dark:text-[#f5f5f7]"
			initial={
				reducedMotion
					? false
					: { opacity: 0, y: 30, scale: 0.975, filter: "blur(5px)" }
			}
			animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
			transition={
				reducedMotion
					? { duration: 0 }
					: {
							y: {
								type: "spring",
								stiffness: 105,
								damping: 20,
								mass: 0.85,
								delay: 0.4,
							},
							scale: {
								type: "spring",
								stiffness: 120,
								damping: 21,
								mass: 0.8,
								delay: 0.4,
							},
							opacity: { duration: 0.55, ease, delay: 0.4 },
							filter: { duration: 0.6, ease, delay: 0.4 },
						}
			}
		>
			<div className="flex h-full flex-col">
				<SimplifiedEditorGraphic reducedMotion={reducedMotion} />

				{/* Same vertical structure as software-web cards so height matches. */}
				<div className="flex min-h-0 flex-1 flex-col p-[clamp(1.5rem,3vw,2rem)] text-center">
					<p
						className="m-0 text-[0.68rem] leading-none font-semibold tracking-[0.06em] text-transparent uppercase select-none"
						aria-hidden="true"
					>
						Background reading
					</p>
					<h2 className="mt-[0.65rem] mb-0 flex min-h-[calc(1.2rem*1.12*3)] max-w-[14rem] items-center justify-center self-center text-[1.2rem] leading-[1.12] font-semibold tracking-[-0.035em]">
						One background reading
					</h2>
					<div className="mt-10 flex flex-col items-center" aria-hidden="true">
						<span className="inline-flex size-12" />
						<span className="mt-[0.5rem] text-[0.78rem] leading-none font-medium text-transparent">
							Read
						</span>
					</div>
				</div>
			</div>
		</motion.article>
	);
}

export default function HomePage() {
	const reducedMotion = useReducedMotion();

	return (
		<div className="relative isolate min-h-[calc(100dvh-4.5rem)] bg-[#f5f5f7] dark:bg-[#1d1d1f]">
			<PageContainer
				as="section"
				className="relative z-[1] flex min-h-[calc(100dvh-4.5rem)] flex-col overflow-hidden pt-[clamp(2.5rem,6vw,4.5rem)] pb-[clamp(4rem,9vw,7rem)]"
			>
				<div className="w-full max-w-[39rem] text-left">
					<motion.h1
						className="m-0 max-w-none whitespace-nowrap text-[clamp(1.45rem,7vw,2.15rem)] leading-[1.08] font-semibold tracking-[-0.04em] text-[var(--sea-ink)] sm:text-[clamp(2.15rem,4.8vw,3.5rem)]"
						initial={
							reducedMotion ? false : { opacity: 0, y: 18, filter: "blur(6px)" }
						}
						animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
						transition={{ duration: 0.82, ease, delay: 0.06 }}
					>
						One conversation at a time.
					</motion.h1>
					<motion.p
						className="mt-5 mb-0 max-w-[36rem] text-pretty text-[clamp(1.05rem,2vw,1.2rem)] leading-[1.5] tracking-[-0.018em] text-[var(--sea-ink-soft)]"
						initial={
							reducedMotion ? false : { opacity: 0, y: 13, filter: "blur(4px)" }
						}
						animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
						transition={{ duration: 0.72, ease, delay: 0.18 }}
					>
						Pure human tokens: authentic and unprompted.
					</motion.p>
				</div>

				<div className="mx-auto mt-[clamp(2.5rem,6vw,4.5rem)] grid w-full max-w-[42rem] grid-cols-1 justify-items-center gap-[clamp(1.25rem,3vw,2rem)] sm:grid-cols-2">
					<InterviewCard reducedMotion={Boolean(reducedMotion)} />
					<BackgroundReadingCard reducedMotion={Boolean(reducedMotion)} />
				</div>
			</PageContainer>
		</div>
	);
}
