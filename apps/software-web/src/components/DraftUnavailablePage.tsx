import { Link } from "@tanstack/react-router";
import PageContainer from "./PageContainer";

export default function DraftUnavailablePage() {
	return (
		<main className="flex min-h-[58vh] items-center bg-(--surface) px-4 py-16 text-(--sea-ink) sm:py-24">
			<PageContainer>
				<section className="mx-auto max-w-136 text-center">
					<p className="m-0 text-[0.7rem] font-semibold tracking-[0.08em] text-(--sea-ink-soft) uppercase">
						Draft link
					</p>
					<h1 className="mt-4 mb-0 text-[clamp(1.65rem,4vw,2.25rem)] leading-[1.12] font-semibold tracking-[-0.04em]">
						This draft link is no longer available.
					</h1>
					<p className="mt-4 mb-0 text-[0.98rem] leading-[1.55] text-(--sea-ink-soft)">
						It may have expired, been revoked, or been replaced.
					</p>
					<Link
						to="/"
						className="mt-7 inline-flex min-h-10 items-center justify-center rounded-full bg-(--sea-ink) px-5 text-[0.85rem] font-semibold text-(--bg-base) no-underline transition-opacity hover:opacity-80"
					>
						Return home
					</Link>
				</section>
			</PageContainer>
		</main>
	);
}
