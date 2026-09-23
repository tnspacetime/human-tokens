import { motion } from "motion/react";

const ease = [0.22, 1, 0.36, 1] as const;

type RetroMagazineProps = {
	reducedMotion: boolean;
};

export default function RetroMagazine({ reducedMotion }: RetroMagazineProps) {
	return (
		<div
			className="pointer-events-none absolute top-[54%] left-[58%] z-0 -translate-x-1/2 -translate-y-1/2 opacity-45 sm:left-[56%] sm:opacity-50 min-[800px]:top-1/2 min-[800px]:left-[54%] min-[800px]:opacity-55"
			aria-hidden="true"
		>
			<motion.div
				initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.96 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				transition={{ duration: 1.1, ease, delay: 0.22 }}
			>
				<motion.div
					animate={
						reducedMotion
							? { x: 0, y: 0, rotate: 4 }
							: {
									x: [0, 3, -2, 0],
									y: [0, -7, -2, 0],
									rotate: [4, 3.25, 4.5, 4],
								}
					}
					transition={
						reducedMotion
							? { duration: 0 }
							: {
									duration: 15,
									ease: "easeInOut",
									repeat: Infinity,
									repeatType: "loop",
								}
					}
					className="relative aspect-[0.715] w-[clamp(11.5rem,20vw,14.5rem)] overflow-hidden rounded-md bg-[#efe3c9] text-[#132c3c]"
				>
					<div className="absolute inset-0 opacity-[0.2] bg-[radial-gradient(rgba(34,39,31,0.38)_0.55px,transparent_0.75px)] bg-size-[3px_3px]" />

					<div className="relative flex h-full flex-col p-[0.7rem] sm:p-[0.78rem]">
						<div className="flex items-end justify-between border-b border-[#132c3c]/55 pb-[0.35rem]">
							<p className="m-0 font-[Georgia,'Times_New_Roman',serif] text-[1.05rem] leading-[0.82] font-bold tracking-[-0.075em] sm:text-[1.2rem]">
								HUMAN
								<br />
								TOKENS
							</p>
							<p className="m-0 text-right text-[0.39rem] leading-tight font-bold tracking-[0.13em] uppercase sm:text-[0.43rem]">
								Made by hand
								<br />
								No AI in the room
							</p>
						</div>

						<div className="mt-[0.55rem] flex items-center justify-between bg-[#df4b35] px-[0.45rem] py-[0.28rem] text-[#fff7df]">
							<span className="text-[0.38rem] font-bold tracking-[0.16em] uppercase sm:text-[0.42rem]">
								The developer interview
							</span>
							<span className="text-[0.38rem] font-bold tracking-[0.12em] sm:text-[0.42rem]">
								№ 001
							</span>
						</div>

						<div className="relative mt-[0.55rem] flex min-h-0 flex-1 overflow-hidden bg-[#196e98]">
							<div className="absolute top-[12%] left-[-15%] size-[69%] rounded-full bg-[#f1bf3e]" />
							<div className="absolute right-[-26%] bottom-[-10%] size-[78%] rounded-full border-[0.7rem] border-[#e85a42] sm:border-[0.8rem]" />
							<div className="absolute top-[14%] right-[8%] flex size-[30%] items-center justify-center rounded-full bg-[#efe3c9] text-center text-[0.38rem] leading-[1.15] font-extrabold tracking-[0.07em] uppercase sm:text-[0.42rem]">
								One
								<br />
								every
								<br />
								day
							</div>
							<p className="absolute bottom-[8%] left-[8%] m-0 font-[Georgia,'Times_New_Roman',serif] text-[1.35rem] leading-[0.79] font-bold tracking-[-0.085em] text-[#fff7df] sm:text-[1.55rem]">
								HOW
								<br />
								WE
								<br />
								BUILD
							</p>
						</div>

						<div className="mt-[0.55rem] grid grid-cols-[1fr_auto] items-end gap-2">
							<p className="m-0 max-w-36 text-[0.42rem] leading-tight font-bold tracking-[0.08em] uppercase sm:text-[0.46rem]">
								Five to ten questions.
								<br />A human answer, kept.
							</p>
							<span className="inline-block bg-[#132c3c] px-[0.3rem] py-[0.2rem] text-[0.38rem] font-bold tracking-[0.13em] text-[#efe3c9] uppercase">
								Read slowly
							</span>
						</div>
					</div>
				</motion.div>
			</motion.div>
		</div>
	);
}
