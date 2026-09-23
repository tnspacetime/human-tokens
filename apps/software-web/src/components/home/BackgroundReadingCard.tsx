import { BookOpenText } from "lucide-react";
import { motion } from "motion/react";

const ease = [0.22, 1, 0.36, 1] as const;

type BackgroundReadingCardProps = {
	title: string;
	reducedMotion: boolean;
};

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
							// biome-ignore lint/suspicious/noArrayIndexKey: This is a fixed positional character animation with no item state.
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
		<div className="flex h-40 flex-col bg-[#ff9500]" aria-hidden="true">
			<div className="flex h-8 shrink-0 items-center px-3 text-white">
				<div className="flex gap-1.5">
					<span className="size-2 rounded-full bg-[#df4b35]" />
					<span className="size-2 rounded-full bg-[#e4ad32]" />
					<span className="size-2 rounded-full bg-[#4f8468]" />
				</div>
				<span className="mx-auto pr-6 font-mono text-[0.52rem] font-bold tracking-widest uppercase">
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
				<div className="overflow-hidden px-3 pt-3 font-mono text-[0.54rem] leading-[1.65] text-[#1d1d1f]">
					<TypingLine
						segments={[
							{
								text: "// RELIABLE DELIVERY",
								className: "text-white/85",
							},
						]}
						delay={0.2}
						reducedMotion={reducedMotion}
					/>
					<TypingLine
						segments={[
							{ text: "const ", className: "text-[#5b167d]" },
							{ text: "delay", className: "text-[#073b76]" },
							{ text: " = attempt ** 2", className: "text-[#1d1d1f]/75" },
						]}
						delay={1.15}
						reducedMotion={reducedMotion}
					/>
					<TypingLine
						segments={[
							{ text: "await ", className: "text-[#5b167d]" },
							{ text: "queue", className: "text-[#005c4b]" },
							{ text: ".retryAfter(delay)" },
						]}
						delay={2.35}
						reducedMotion={reducedMotion}
					/>
					<TypingLine
						segments={[
							{ text: "observe", className: "text-[#073b76]" },
							{ text: "({ latency, failures })" },
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

export default function BackgroundReadingCard({
	title,
	reducedMotion,
}: BackgroundReadingCardProps) {
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
			<a
				href="#background-reading"
				className="group flex h-full flex-col text-[#1d1d1f] no-underline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#0071e3] dark:text-[#f5f5f7]"
				aria-label={`Read the background reading: ${title}`}
			>
				<SimplifiedEditorGraphic reducedMotion={reducedMotion} />

				<div className="flex min-h-0 flex-1 flex-col p-[clamp(1.5rem,3vw,2rem)]">
					<p className="m-0 text-[0.68rem] leading-none font-semibold tracking-[0.06em] text-[#6e6e73] uppercase dark:text-[#a1a1a6]">
						Background reading
					</p>
					<h2 className="mt-[0.65rem] mb-0 max-w-56 text-[1.2rem] leading-[1.12] font-semibold tracking-[-0.035em]">
						{title}
					</h2>
					<div className="mt-10 flex flex-col items-center">
						<span className="inline-flex size-12 items-center justify-center rounded-[0.9rem] bg-[#1d1d1f] text-white transition-transform duration-200 group-hover:-translate-y-0.5 group-active:scale-[0.96] dark:bg-[#f5f5f7] dark:text-[#1d1d1f]">
							<BookOpenText size={21} strokeWidth={2} aria-hidden="true" />
						</span>
						<span className="mt-2 text-[0.78rem] leading-none font-medium">
							Read
						</span>
					</div>
				</div>
			</a>
		</motion.article>
	);
}
