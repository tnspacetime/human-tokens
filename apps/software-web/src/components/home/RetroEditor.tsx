import { motion } from "motion/react";

const ease = [0.22, 1, 0.36, 1] as const;

type RetroEditorProps = {
	reducedMotion: boolean;
};

export default function RetroEditor({ reducedMotion }: RetroEditorProps) {
	return (
		<div
			className="pointer-events-none absolute top-[66%] left-[34%] z-0 -translate-x-1/2 -translate-y-1/2 opacity-35 sm:left-[38%] sm:opacity-40 min-[800px]:top-[64%] min-[800px]:left-[40%] min-[800px]:opacity-48"
			aria-hidden="true"
		>
			<motion.div
				initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.96 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				transition={{ duration: 1.15, ease, delay: 0.38 }}
			>
				<motion.div
					animate={
						reducedMotion
							? { x: 0, y: 0, rotate: -3.5 }
							: {
									x: [0, -3, 2, 0],
									y: [0, 4, -3, 0],
									rotate: [-3.5, -2.75, -4.1, -3.5],
								}
					}
					transition={
						reducedMotion
							? { duration: 0 }
							: {
									duration: 18,
									ease: "easeInOut",
									repeat: Infinity,
									repeatType: "loop",
								}
					}
					className="relative aspect-[1.48] w-[clamp(13rem,25vw,18rem)] overflow-hidden rounded-[0.42rem] border border-[#17202a]/35 bg-[#172a35] text-[#f4e5c3]"
				>
					<div className="absolute inset-0 opacity-[0.12] bg-[radial-gradient(rgba(255,245,220,0.55)_0.45px,transparent_0.7px)] bg-size-[3px_3px]" />

					<div className="relative flex h-full flex-col">
						<div className="flex h-7 shrink-0 items-center border-b border-[#17202a]/25 bg-[#eadbb9] px-[0.55rem] text-[#172a35]">
							<div className="flex gap-[0.28rem]">
								<span className="size-[0.38rem] rounded-full bg-[#df4b35]" />
								<span className="size-[0.38rem] rounded-full bg-[#e4ad32]" />
								<span className="size-[0.38rem] rounded-full bg-[#4f8468]" />
							</div>
							<span className="mx-auto pr-[1.2rem] font-mono text-[0.48rem] font-bold tracking-[0.11em] uppercase">
								interview.txt
							</span>
						</div>

						<div className="flex min-h-0 flex-1">
							<div className="flex w-8 shrink-0 flex-col items-end gap-[0.36rem] border-r border-[#f4e5c3]/12 bg-[#10212b] px-[0.4rem] pt-[0.58rem] font-mono text-[0.42rem] leading-none text-[#8ea3a7]">
								<span>01</span>
								<span>02</span>
								<span>03</span>
								<span>04</span>
								<span>05</span>
								<span>06</span>
							</div>

							<div className="relative min-w-0 flex-1 overflow-hidden px-[0.65rem] pt-[0.53rem] font-mono text-[0.48rem] leading-[1.58] sm:text-[0.52rem]">
								<p className="m-0 text-[#76a9bf]">{"// HUMAN TOKENS"}</p>
								<p className="m-0">
									<span className="text-[#e6755f]">question</span>
									<span className="text-[#8ea3a7]"> = </span>
									<span className="text-[#f0c85b]">
										&quot;What do you notice
									</span>
								</p>
								<p className="m-0 pl-[0.6rem] text-[#f0c85b]">
									when no one is watching?&quot;
								</p>
								<p className="m-0 text-[#8ea3a7]">&nbsp;</p>
								<p className="m-0">
									<span className="text-[#6fb68e]">answer</span>
									<span className="text-[#8ea3a7]"> = </span>
									<span className="text-[#f4e5c3]">human_voice</span>
								</p>
								<p className="m-0 text-[#e6755f]">▌</p>
							</div>
						</div>

						<div className="flex h-[1.12rem] shrink-0 items-center justify-between bg-[#e4ad32] px-2 font-mono text-[0.38rem] font-bold tracking-[0.08em] text-[#172a35] uppercase">
							<span>Plain text</span>
							<span>Hand edited · Ln 06</span>
						</div>
					</div>
				</motion.div>
			</motion.div>
		</div>
	);
}
