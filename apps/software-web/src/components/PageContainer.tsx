import type { HTMLAttributes } from "react";
import { cn } from "#/lib/utils";

type PageContainerProps = HTMLAttributes<HTMLElement> & {
	as?: "div" | "nav" | "section";
};

export default function PageContainer({
	as: Component = "div",
	className,
	...props
}: PageContainerProps) {
	return (
		<Component
			className={cn("mx-auto w-[min(1080px,calc(100%-3rem))]", className)}
			{...props}
		/>
	);
}
