import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSanitize, {
	defaultSchema,
	type Options as SanitizeSchema,
} from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { remarkStandaloneDoubleDollarMath } from "./remark-math";

const markdownSchema: SanitizeSchema = {
	...defaultSchema,
	attributes: {
		...defaultSchema.attributes,
		code: [
			...(defaultSchema.attributes?.code ?? []),
			["className", /^language-./, "math-inline", "math-display"],
		],
	},
};

/**
 * Compiles untrusted Markdown into sanitized HTML.
 *
 * Raw HTML is deliberately excluded. Sanitization runs before the trusted
 * KaTeX and Shiki transforms so their generated markup remains intact.
 */
export async function renderMarkdown(markdown: string): Promise<string> {
	const result = await unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkMath)
		.use(remarkStandaloneDoubleDollarMath)
		.use(remarkRehype)
		.use(rehypeSanitize, markdownSchema)
		.use(rehypeKatex, { strict: "warn" })
		.use(rehypePrettyCode, {
			theme: {
				light: "vitesse-light",
				dark: "vitesse-dark",
			},
			keepBackground: false,
			defaultLang: { block: "plaintext" },
		})
		.use(rehypeStringify)
		.process(markdown);

	return String(result);
}
