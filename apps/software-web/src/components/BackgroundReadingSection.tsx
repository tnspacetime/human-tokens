import { motion, useReducedMotion } from "motion/react";
import type { PublishedBackgroundReading } from "../features/publications/publication.types";
import Markdown from "./Markdown";
import PageContainer from "./PageContainer";

const ease = [0.22, 1, 0.36, 1] as const;

export default function BackgroundReadingSection({
	backgroundReading,
	reducedMotion,
	standalone = false,
}: {
	backgroundReading: PublishedBackgroundReading;
	reducedMotion?: boolean;
	standalone?: boolean;
}) {
	const prefersReducedMotion = useReducedMotion();
	const shouldReduceMotion = reducedMotion ?? Boolean(prefersReducedMotion);
	const Heading = standalone ? "h1" : "h2";

	return (
		<section
			id="background-reading"
			className="w-full scroll-mt-16 bg-white dark:bg-black"
		>
			<PageContainer className="py-[clamp(4.5rem,10vw,8rem)]">
				<div className="mx-auto max-w-2xl">
					<motion.header
						initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-10% 0px" }}
						transition={{ duration: 0.75, ease }}
					>
						<Heading className="m-0 max-w-[15ch] text-balance text-[clamp(2.4rem,6vw,4.5rem)] leading-[0.98] font-semibold tracking-[-0.055em]">
							{backgroundReading.title}
						</Heading>
						<Markdown
							html={backgroundReading.summaryHtml}
							className="mt-5 max-w-160 text-pretty text-[clamp(1.05rem,2vw,1.2rem)] leading-normal tracking-[-0.018em] text-(--sea-ink-soft) *:first:mt-0 *:last:mb-0"
						/>
					</motion.header>

					<motion.div
						initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-6% 0px" }}
						transition={{ duration: 0.68, ease }}
					>
						<Markdown
							html={backgroundReading.contentHtml}
							className="article-markdown mt-[clamp(3.5rem,8vw,6rem)] *:first:mt-0 *:last:mb-0"
						/>
					</motion.div>
				</div>
			</PageContainer>
		</section>
	);
}
