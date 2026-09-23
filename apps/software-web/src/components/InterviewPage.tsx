import { Link } from "@tanstack/react-router";
import type { PublishedPublication } from "../features/publications/publication.types";
import BackgroundReadingSection from "./BackgroundReadingSection";
import InterviewSection from "./InterviewSection";
import PageContainer from "./PageContainer";

export default function InterviewPage({
	publication,
}: {
	publication: PublishedPublication;
}) {
	const { interview, backgroundReading } = publication;

	return (
		<main className="min-h-screen bg-[#f5f5f7] text-(--sea-ink) dark:bg-[#1d1d1f]">
			<InterviewSection interview={interview} standalone />
			<BackgroundReadingSection backgroundReading={backgroundReading} />
		</main>
	);
}

export function InterviewNotFoundPage() {
	return (
		<main className="min-h-[70vh] bg-(--bg-base) text-(--sea-ink)">
			<PageContainer className="py-[clamp(5rem,12vw,9rem)]">
				<div className="mx-auto max-w-180">
					<p className="m-0 text-[0.72rem] font-semibold tracking-[0.08em] text-(--sea-ink-soft) uppercase">
						404
					</p>
					<h1 className="mt-5 mb-0 text-[clamp(2.75rem,7vw,5.25rem)] leading-[0.96] font-semibold tracking-[-0.06em]">
						Interview not found.
					</h1>
					<p className="mt-6 mb-0 max-w-136 text-[clamp(1.05rem,2.3vw,1.3rem)] leading-[1.45] text-(--sea-ink-soft)">
						This link may be incomplete, or the interview is no longer
						available.
					</p>
					<Link
						to="/guests"
						className="mt-8 inline-flex rounded-full bg-(--sea-ink) px-5 py-3 text-[0.9rem] font-semibold text-(--bg-base) no-underline transition-opacity hover:opacity-80"
					>
						Browse guests
					</Link>
				</div>
			</PageContainer>
		</main>
	);
}
