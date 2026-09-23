import { motion, useReducedMotion } from "motion/react";
import type { PublishedPublication } from "../../features/publications/publication.types";
import BackgroundReadingSection from "../BackgroundReadingSection";
import InterviewSection from "../InterviewSection";
import PageContainer from "../PageContainer";
import StoreButtons from "../StoreButtons";
import BackgroundReadingCard from "./BackgroundReadingCard";
import InterviewCard from "./InterviewCard";

const ease = [0.22, 1, 0.36, 1] as const;

export default function HomePage({
	publication,
}: {
	publication: PublishedPublication;
}) {
	const reducedMotion = useReducedMotion();
	const { interview, backgroundReading } = publication;

	return (
		<div className="relative isolate bg-[#f5f5f7] dark:bg-[#1d1d1f]">
			<PageContainer
				as="section"
				className="relative z-1 flex min-h-[clamp(31rem,68vh,42rem)] flex-col overflow-hidden pt-[clamp(2.5rem,6vw,4.5rem)] pb-[clamp(4rem,9vw,7rem)]"
			>
				<div className="w-full max-w-156 text-left">
					<motion.h1
						className="m-0 max-w-none whitespace-nowrap text-[clamp(1.45rem,7vw,2.15rem)] leading-[1.08] font-semibold tracking-[-0.04em] text-(--sea-ink) sm:text-[clamp(2.15rem,4.8vw,3.5rem)]"
						initial={
							reducedMotion ? false : { opacity: 0, y: 18, filter: "blur(6px)" }
						}
						animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
						transition={{ duration: 0.82, ease, delay: 0.06 }}
					>
						One conversation at a time.
					</motion.h1>
					<motion.p
						className="mt-5 mb-0 max-w-xl text-pretty text-[clamp(1.05rem,2vw,1.2rem)] leading-normal tracking-[-0.018em] text-(--sea-ink-soft)"
						initial={
							reducedMotion ? false : { opacity: 0, y: 13, filter: "blur(4px)" }
						}
						animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
						transition={{ duration: 0.72, ease, delay: 0.18 }}
					>
						Pure human tokens: developers in their own words, authentic and
						unprompted.
					</motion.p>
				</div>

				<div className="mx-auto mt-[clamp(2.5rem,6vw,4.5rem)] grid w-full max-w-2xl grid-cols-1 justify-items-center gap-[clamp(1.25rem,3vw,2rem)] sm:grid-cols-2">
					<InterviewCard
						headline={interview.headline}
						reducedMotion={Boolean(reducedMotion)}
					/>
					<BackgroundReadingCard
						title={backgroundReading.title}
						reducedMotion={Boolean(reducedMotion)}
					/>
				</div>
			</PageContainer>

			<InterviewSection
				interview={interview}
				reducedMotion={Boolean(reducedMotion)}
			/>

			<BackgroundReadingSection
				backgroundReading={backgroundReading}
				reducedMotion={Boolean(reducedMotion)}
			/>

			<section className="w-full bg-transparent">
				<PageContainer className="py-[clamp(3.5rem,8vw,6.5rem)]">
					<motion.h2
						className="m-0 max-w-[22ch] text-balance text-[clamp(2rem,5vw,3.4rem)] leading-[1.04] font-semibold tracking-[-0.045em] text-(--sea-ink)"
						initial={reducedMotion ? false : { opacity: 0, y: 18 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-10% 0px" }}
						transition={{ duration: 0.75, ease }}
					>
						The next conversation is waiting.
					</motion.h2>
					<motion.p
						className="mt-4 max-w-xl text-[clamp(1rem,2vw,1.12rem)] leading-[1.55] tracking-[-0.016em] text-(--sea-ink-soft)"
						initial={reducedMotion ? false : { opacity: 0, y: 12 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-10% 0px" }}
						transition={{ duration: 0.7, ease, delay: 0.06 }}
					>
						Interviews with developers — written for the people who still want
						to go deep.
					</motion.p>
					<StoreButtons />
				</PageContainer>
			</section>
		</div>
	);
}
