import { Link } from "@tanstack/react-router";
import { MessageSquareQuote } from "lucide-react";
import PageContainer from "./PageContainer";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
	return (
		<header className="sticky top-0 z-50 border-0 bg-(--bg-base) px-4 shadow-none">
			<PageContainer
				as="nav"
				className="flex min-h-14 items-center gap-3 py-2.5 sm:min-h-16 sm:py-3"
			>
				<Link
					to="/"
					className="inline-flex shrink-0 items-center gap-[0.7rem] text-(--sea-ink) no-underline [transition:opacity_180ms_ease,transform_220ms_cubic-bezier(0.22,1,0.36,1)] hover:text-(--sea-ink) hover:opacity-[0.88] active:scale-[0.96]"
					activeOptions={{ exact: true }}
					aria-label="Human Tokens home"
				>
					<MessageSquareQuote
						className="shrink-0 text-(--sea-ink)"
						size={27}
						strokeWidth={1.65}
						aria-hidden="true"
					/>
				</Link>

				<Link
					to="/guests"
					className="ml-1 inline-flex items-center px-2 py-1 text-[0.875rem] font-medium tracking-[-0.014em] text-(--sea-ink) no-underline transition-opacity duration-150 hover:text-(--sea-ink) hover:opacity-60"
					activeProps={{ className: "font-semibold" }}
				>
					Guests
				</Link>

				<div className="ml-auto shrink-0">
					<ThemeToggle />
				</div>
			</PageContainer>
		</header>
	);
}
