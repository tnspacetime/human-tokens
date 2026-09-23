import { useState } from "react";
import { getWebGuestsPage } from "../features/guests/guests.functions";
import type { PublicGuestsResponse } from "../features/guests/guests.types";
import PageContainer from "./PageContainer";

export default function GuestsPage({
	initialPage,
}: {
	initialPage: PublicGuestsResponse;
}) {
	const [guestItems, setGuestItems] = useState(initialPage.items);
	const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [loadMoreError, setLoadMoreError] = useState(false);

	const loadMore = async () => {
		if (!nextCursor || isLoadingMore) {
			return;
		}

		setIsLoadingMore(true);
		setLoadMoreError(false);

		try {
			const nextPage = await getWebGuestsPage({
				data: { cursor: nextCursor },
			});
			setGuestItems((currentItems) => [...currentItems, ...nextPage.items]);
			setNextCursor(nextPage.nextCursor);
		} catch {
			setLoadMoreError(true);
		} finally {
			setIsLoadingMore(false);
		}
	};

	return (
		<main className="min-h-screen bg-[#f5f5f7] text-(--sea-ink) dark:bg-[#1d1d1f]">
			<PageContainer className="py-5 sm:py-[clamp(4rem,10vw,8rem)]">
				<div className="mx-auto max-w-216">
					<header>
						<h1 className="m-0 pb-4 text-[2.125rem] leading-10.25 font-bold tracking-[-0.05rem] sm:mt-4 sm:pb-0 sm:text-[clamp(3rem,8vw,6rem)] sm:leading-[0.92] sm:font-semibold sm:tracking-[-0.06em]">
							Guests
						</h1>
					</header>

					<section
						className="sm:mt-[clamp(4.5rem,10vw,8rem)]"
						aria-label="All guests"
					>
						{guestItems.length > 0 ? (
							<ul className="m-0 w-full list-none p-0 sm:flex sm:max-w-184 sm:flex-wrap sm:gap-x-[clamp(1.25rem,3vw,2.25rem)] sm:gap-y-[clamp(0.65rem,1.5vw,0.9rem)]">
								{guestItems.map((guest) => (
									<li
										key={guest.id}
										className="py-2 text-[1.25rem] leading-6.5 font-semibold tracking-[-0.021875rem] text-(--sea-ink) sm:p-0 sm:text-[clamp(1.05rem,1.8vw,1.3rem)] sm:leading-tight sm:font-medium sm:tracking-tight"
									>
										{guest.name}
									</li>
								))}
							</ul>
						) : (
							<p className="m-0 text-(--sea-ink-soft)">
								No published guests yet.
							</p>
						)}

						{loadMoreError ? (
							<p
								className="mt-6 mb-0 text-sm text-(--sea-ink-soft)"
								role="alert"
							>
								The next guests could not be loaded. Please try again.
							</p>
						) : null}

						{nextCursor ? (
							<button
								type="button"
								onClick={() => void loadMore()}
								disabled={isLoadingMore}
								className="mt-8 inline-flex rounded-full bg-(--sea-ink) px-5 py-3 text-[0.9rem] font-semibold text-(--bg-base) transition-opacity hover:opacity-80 disabled:cursor-wait disabled:opacity-50"
							>
								{isLoadingMore ? "Loading…" : "Load more"}
							</button>
						) : null}
					</section>
				</div>
			</PageContainer>
		</main>
	);
}
