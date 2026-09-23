type DraftTitleFieldProps = {
	value: string;
	onChange: (value: string) => void;
};

export default function DraftTitleField({
	value,
	onChange,
}: DraftTitleFieldProps) {
	return (
		<label className="grid gap-2">
			<span className="text-[0.72rem] font-semibold tracking-[0.07em] text-(--sea-ink-soft) uppercase">
				Title
			</span>
			<input
				type="text"
				value={value}
				onChange={(event) => {
					onChange(event.target.value);
				}}
				className="min-h-12 w-full rounded-xl border-0 bg-(--surface-strong) px-4 text-[1.05rem] font-medium tracking-[-0.02em] text-(--sea-ink) outline-none transition-shadow focus:ring-2 focus:ring-[#0071e3]/20"
			/>
		</label>
	);
}
