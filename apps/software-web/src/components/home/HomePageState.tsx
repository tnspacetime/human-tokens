import { LoaderCircle, MessageSquareQuote } from "lucide-react";
import PageContainer from "../PageContainer";
import StoreButtons from "../StoreButtons";

type HomePageStateProps = {
	message: string;
	onRetry?: () => void;
	pending?: boolean;
	showMobileApps?: boolean;
};

export default function HomePageState({
	message,
	onRetry,
	pending = false,
	showMobileApps = false,
}: HomePageStateProps) {
	return (
		<main className="bg-[#f5f5f7] text-(--sea-ink) dark:bg-[#1d1d1f]">
			<PageContainer className="flex min-h-[70vh] items-center justify-center py-[clamp(5rem,12vw,9rem)]">
				<div
					className="flex w-full max-w-120 flex-col items-center text-center"
					aria-live="polite"
				>
					<span className="inline-flex size-20 items-center justify-center rounded-[1.5rem] bg-[#0071e3] text-white">
						{pending ? (
							<LoaderCircle
								aria-hidden="true"
								className="animate-spin"
								size={34}
								strokeWidth={1.8}
							/>
						) : (
							<MessageSquareQuote
								aria-hidden="true"
								size={36}
								strokeWidth={1.8}
							/>
						)}
					</span>
					<h1 className="mt-7 mb-0 max-w-[24rem] text-balance text-[clamp(2rem,5vw,3rem)] leading-[1.04] font-semibold tracking-[-0.045em]">
						One meaningful reading at a time.
					</h1>
					<p className="mt-4 mb-0 max-w-[24rem] text-[clamp(1rem,2vw,1.12rem)] leading-normal text-(--sea-ink-soft)">
						{message}
					</p>
					{onRetry ? (
						<button
							type="button"
							onClick={onRetry}
							className="mt-7 inline-flex rounded-full bg-(--sea-ink) px-5 py-3 text-[0.9rem] font-semibold text-(--bg-base) transition-opacity hover:opacity-80"
						>
							Try again
						</button>
					) : null}
					{showMobileApps ? <StoreButtons /> : null}
				</div>
			</PageContainer>
		</main>
	);
}
