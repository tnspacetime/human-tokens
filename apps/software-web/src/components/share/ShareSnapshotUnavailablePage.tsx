import { Link } from "@tanstack/react-router";
import PageContainer from "../PageContainer";

export default function ShareSnapshotUnavailablePage() {
	return (
		<main className="min-h-[70vh] bg-(--bg-base) text-(--sea-ink)">
			<PageContainer className="py-[clamp(5rem,12vw,9rem)]">
				<div className="mx-auto max-w-180">
					<p className="m-0 text-[0.72rem] font-semibold tracking-[0.08em] text-(--sea-ink-soft) uppercase">
						Unavailable
					</p>
					<h1 className="mt-5 mb-0 text-[clamp(2.75rem,7vw,5.25rem)] leading-[0.96] font-semibold tracking-[-0.06em]">
						This shared reading is no longer available.
					</h1>
					<p className="mt-6 mb-0 max-w-136 text-[clamp(1.05rem,2.3vw,1.3rem)] leading-[1.45] text-(--sea-ink-soft)">
						The link may be incomplete or it may have been revoked.
					</p>
					<Link
						to="/"
						className="mt-8 inline-flex rounded-full bg-(--sea-ink) px-5 py-3 text-[0.9rem] font-semibold text-(--bg-base) no-underline transition-opacity hover:opacity-80"
					>
						Go to Human Tokens
					</Link>
				</div>
			</PageContainer>
		</main>
	);
}
