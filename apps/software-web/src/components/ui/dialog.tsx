import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "#/lib/utils.ts";

function Dialog({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
	return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
	return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			data-slot="dialog-overlay"
			className={cn(
				"fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
				className,
			)}
			{...props}
		/>
	);
}

function DialogContent({
	className,
	children,
	showCloseButton = true,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
	showCloseButton?: boolean;
}) {
	return (
		<DialogPortal>
			<DialogOverlay />
			<DialogPrimitive.Content
				data-slot="dialog-content"
				className={cn(
					"fixed top-1/2 left-1/2 z-50 grid max-h-[min(46rem,calc(100dvh-2rem))] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 gap-6 overflow-y-auto rounded-[1.75rem] bg-(--surface-strong) p-6 text-(--sea-ink) shadow-2xl outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:p-8",
					className,
				)}
				{...props}
			>
				{children}
				{showCloseButton ? (
					<DialogPrimitive.Close className="absolute top-5 right-5 inline-flex size-8 cursor-pointer items-center justify-center rounded-full border-0 bg-(--surface) text-(--sea-ink-soft) transition-opacity hover:opacity-60 focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:outline-none">
						<XIcon className="size-4" />
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>
				) : null}
			</DialogPrimitive.Content>
		</DialogPortal>
	);
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-header"
			className={cn("grid gap-2 pr-9", className)}
			{...props}
		/>
	);
}

function DialogTitle({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={cn(
				"m-0 text-[1.4rem] leading-tight font-semibold tracking-[-0.035em]",
				className,
			)}
			{...props}
		/>
	);
}

function DialogDescription({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={cn(
				"m-0 text-[0.9rem] leading-6 text-(--sea-ink-soft)",
				className,
			)}
			{...props}
		/>
	);
}

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
};
