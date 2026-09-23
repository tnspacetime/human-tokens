import { Check, Link2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type CopyFeedback = "idle" | "copied" | "error";

async function copyToClipboard(value: string) {
	if (navigator.clipboard) {
		await navigator.clipboard.writeText(value);
		return;
	}

	const textArea = document.createElement("textarea");
	textArea.value = value;
	textArea.setAttribute("readonly", "");
	textArea.style.position = "fixed";
	textArea.style.opacity = "0";
	document.body.appendChild(textArea);
	textArea.select();
	const copied = document.execCommand("copy");
	textArea.remove();

	if (!copied) {
		throw new Error("The browser could not copy the link.");
	}
}

export default function CopyInterviewLink({ publicId }: { publicId: string }) {
	const [feedback, setFeedback] = useState<CopyFeedback>("idle");
	const resetTimer = useRef<number | undefined>(undefined);

	useEffect(
		() => () => {
			if (resetTimer.current !== undefined) {
				window.clearTimeout(resetTimer.current);
			}
		},
		[],
	);

	function showFeedback(nextFeedback: CopyFeedback) {
		setFeedback(nextFeedback);

		if (resetTimer.current !== undefined) {
			window.clearTimeout(resetTimer.current);
		}

		resetTimer.current = window.setTimeout(() => {
			setFeedback("idle");
		}, 2400);
	}

	async function handleCopy() {
		try {
			const interviewUrl = new URL(
				`/i/${encodeURIComponent(publicId)}`,
				window.location.origin,
			);
			await copyToClipboard(interviewUrl.href);
			showFeedback("copied");
		} catch {
			showFeedback("error");
		}
	}

	return (
		<div className="mt-7 flex items-center gap-3">
			<button
				type="button"
				onClick={handleCopy}
				className="inline-flex min-h-10 items-center gap-2 rounded-full bg-(--surface) px-4 text-[0.86rem] font-semibold text-(--sea-ink) transition-opacity hover:opacity-70 active:opacity-55"
			>
				{feedback === "copied" ? (
					<Check size={15} strokeWidth={2} aria-hidden="true" />
				) : (
					<Link2 size={15} strokeWidth={2} aria-hidden="true" />
				)}
				{feedback === "copied" ? "Copied" : "Copy link"}
			</button>
			<span className="text-[0.8rem] text-(--sea-ink-soft)" aria-live="polite">
				{feedback === "error" ? "The link could not be copied." : ""}
			</span>
		</div>
	);
}
