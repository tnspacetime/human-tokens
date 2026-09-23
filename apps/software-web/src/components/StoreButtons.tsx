export default function StoreButtons() {
	return (
		<section
			aria-label="Mobile app availability"
			className="mt-10 flex flex-col items-start gap-3 sm:flex-row"
		>
			<span className="inline-flex min-w-52 cursor-default items-center justify-center gap-3 rounded-full bg-(--bg-base) px-5 py-3 text-left text-(--sea-ink) shadow-sm">
				<span aria-hidden="true" className="text-2xl leading-none">
					
				</span>
				<span>
					<span className="block text-[0.62rem] leading-none text-(--sea-ink-soft) uppercase">
						Coming soon on the
					</span>
					<span className="mt-1 block text-base leading-none font-semibold tracking-[-0.02em]">
						App Store
					</span>
				</span>
			</span>

			<span className="inline-flex min-w-52 cursor-default items-center justify-center gap-3 rounded-full border border-[#EDE9E2]/15 bg-[#1C1B1A] px-5 py-3 text-left text-[#EDE9E2] shadow-sm dark:border-black/10 dark:bg-[#EDE9E2] dark:text-black">
				<span aria-hidden="true" className="text-lg leading-none">
					▶
				</span>
				<span>
					<span className="block text-[0.62rem] leading-none text-[#B8B0A5] uppercase dark:text-black/55">
						Coming soon on
					</span>
					<span className="mt-1 block text-base leading-none font-semibold tracking-[-0.02em]">
						Google Play
					</span>
				</span>
			</span>
		</section>
	);
}
