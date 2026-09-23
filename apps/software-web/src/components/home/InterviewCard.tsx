import { BookOpenText } from "lucide-react";
import { motion } from "motion/react";

const ease = [0.22, 1, 0.36, 1] as const;

type InterviewCardProps = {
	headline: string;
	reducedMotion: boolean;
};

export default function InterviewCard({
	headline,
	reducedMotion,
}: InterviewCardProps) {
	return (
		<motion.article
			className="w-full max-w-[20rem] overflow-hidden rounded-[2rem] bg-white text-[#1d1d1f] dark:bg-[#2c2c2e] dark:text-[#f5f5f7]"
			initial={
				reducedMotion
					? false
					: { opacity: 0, y: 30, scale: 0.975, filter: "blur(5px)" }
			}
			animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
			transition={
				reducedMotion
					? { duration: 0 }
					: {
							y: {
								type: "spring",
								stiffness: 105,
								damping: 20,
								mass: 0.85,
								delay: 0.3,
							},
							scale: {
								type: "spring",
								stiffness: 120,
								damping: 21,
								mass: 0.8,
								delay: 0.3,
							},
							opacity: { duration: 0.55, ease, delay: 0.3 },
							filter: { duration: 0.6, ease, delay: 0.3 },
						}
			}
		>
			<a
				href="#interview"
				className="group flex h-full flex-col text-[#1d1d1f] no-underline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#0071e3] dark:text-[#f5f5f7]"
				aria-label={`Read today's interview: ${headline}`}
			>
				<div className="flex h-40 items-center justify-center">
					<img
						src="/profile-400.png"
						alt=""
						className="size-24 rounded-[1.35rem] object-cover"
					/>
				</div>
				<div className="flex min-h-0 flex-1 flex-col p-[clamp(1.5rem,3vw,2rem)]">
					<p className="m-0 text-[0.68rem] leading-none font-semibold tracking-[0.06em] text-[#6e6e73] uppercase dark:text-[#a1a1a6]">
						Today&apos;s interview
					</p>
					<h2 className="mt-[0.65rem] mb-0 max-w-52 text-[1.2rem] leading-[1.12] font-semibold tracking-[-0.035em]">
						{headline}
					</h2>
					<div className="mt-10 flex flex-col items-center">
						<span className="inline-flex size-12 items-center justify-center rounded-[0.9rem] bg-[#1d1d1f] text-white transition-transform duration-200 group-hover:-translate-y-0.5 group-active:scale-[0.96] dark:bg-[#f5f5f7] dark:text-[#1d1d1f]">
							<BookOpenText size={21} strokeWidth={2} aria-hidden="true" />
						</span>
						<span className="mt-2 text-[0.78rem] leading-none font-medium">
							Read
						</span>
					</div>
				</div>
			</a>
		</motion.article>
	);
}
