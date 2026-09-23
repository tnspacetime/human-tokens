interface MarkdownProps {
	html: string;
	className?: string;
}

export default function Markdown({ html, className }: MarkdownProps) {
	const classes = className ? `markdown ${className}` : "markdown";

	return (
		<div
			className={classes}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: The Markdown renderers sanitize this HTML before it reaches the component.
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}
