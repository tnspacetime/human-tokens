import PageContainer from "./PageContainer";

export default function Footer() {
	const year = new Date().getFullYear();

	return (
		<footer className="bg-(--bg-base) px-4 pb-14 pt-10 text-(--sea-ink-soft)">
			<PageContainer className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
				<p className="m-0 text-sm tracking-[-0.01em]">
					&copy; {year} Human Tokens. All rights reserved.
				</p>
				<a
					href="https://github.com/tnspacetime/human-tokens"
					className="text-sm tracking-[-0.01em] text-(--sea-ink-soft) underline underline-offset-4 transition-opacity hover:opacity-70"
					aria-label="Human Tokens on GitHub"
				>
					GitHub
				</a>
			</PageContainer>
		</footer>
	);
}
