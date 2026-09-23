import { motion, useReducedMotion } from "motion/react";
import CopyInterviewLink from "./CopyInterviewLink";
import Markdown from "./Markdown";

const ease = [0.22, 1, 0.36, 1] as const;

type InterviewArticleContent = {
	headline: string;
	introduction: string;
	introductionHtml?: string;
	contentHtml: string;
};

type InterviewPublication = {
	publicId: string;
	date: string;
	displayDate: string;
};

type InterviewArticleProps = {
	interview: InterviewArticleContent;
	portraitUrl?: string | null;
	guest?: string | null;
	publication?: InterviewPublication | null;
	showPortrait?: boolean;
	standalone?: boolean;
	reducedMotion?: boolean;
};

export default function InterviewArticle({
	interview,
	portraitUrl,
	guest = null,
	publication = null,
	showPortrait = false,
	standalone = false,
	reducedMotion,
}: InterviewArticleProps) {
	const prefersReducedMotion = useReducedMotion();
	const shouldReduceMotion = reducedMotion ?? Boolean(prefersReducedMotion);
	const Headline = standalone ? "h1" : "h2";

	return (
		<div className="mx-auto max-w-2xl">
			<motion.header
				initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true, margin: "-8% 0px" }}
				transition={{ duration: 0.75, ease }}
			>
				{showPortrait || guest || portraitUrl ? (
					<figure className="m-0 mb-[clamp(2rem,5vw,3.5rem)] w-[clamp(8rem,18vw,11rem)]">
						{portraitUrl ? (
							<img
								src={portraitUrl}
								alt={guest ? `${guest} portrait` : "Profile portrait"}
								className="aspect-square w-full rounded-[1.5rem] object-cover"
							/>
						) : (
							<div
								className="aspect-square w-full rounded-[1.5rem] bg-[#0071e3]"
								aria-label={
									guest
										? `Portrait photo placeholder for ${guest}`
										: "Portrait photo placeholder"
								}
								role="img"
							/>
						)}
						{guest ? (
							<figcaption className="mt-3 text-[1.25rem] leading-tight tracking-[-0.02em]">
								{guest}
							</figcaption>
						) : null}
					</figure>
				) : null}

				<p className="m-0 text-[0.7rem] leading-none font-semibold tracking-[0.08em] text-(--sea-ink-soft) uppercase">
					Interview
				</p>
				{publication ? (
					<p className="mt-[0.55rem] mb-0 text-[0.88rem] leading-none text-(--sea-ink-soft)">
						<time dateTime={publication.date}>{publication.displayDate}</time>
					</p>
				) : null}

				<Headline className="mt-[1.7rem] mb-0 max-w-[16ch] text-balance text-[clamp(2.5rem,6.2vw,4.7rem)] leading-[0.98] font-semibold tracking-[-0.055em]">
					{interview.headline}
				</Headline>

				{interview.introductionHtml ? (
					<Markdown
						html={interview.introductionHtml}
						className="mt-[1.35rem] max-w-2xl text-pretty text-[clamp(1.12rem,2.5vw,1.45rem)] leading-[1.35] font-normal tracking-tight text-(--sea-ink) *:first:mt-0 *:last:mb-0"
					/>
				) : (
					<p className="mt-[1.35rem] mb-0 max-w-2xl text-pretty text-[clamp(1.12rem,2.5vw,1.45rem)] leading-[1.35] font-normal tracking-tight">
						{interview.introduction}
					</p>
				)}

				{publication ? (
					<CopyInterviewLink publicId={publication.publicId} />
				) : null}
			</motion.header>

			<motion.div
				className="mt-[clamp(3.5rem,8vw,6rem)]"
				initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true, margin: "-6% 0px" }}
				transition={{ duration: 0.68, ease }}
			>
				<Markdown
					html={interview.contentHtml}
					className="article-markdown interview-markdown"
				/>
			</motion.div>
		</div>
	);
}
