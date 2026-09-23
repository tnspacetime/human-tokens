import type { Root } from "mdast";
import type { Math as MathNode } from "mdast-util-math";
import type { Plugin } from "unified";
import { SKIP, visit } from "unist-util-visit";

export const remarkStandaloneDoubleDollarMath: Plugin<[], Root> = () => {
	return (tree, file) => {
		const source = String(file);

		visit(tree, "paragraph", (node, index, parent) => {
			if (
				index === undefined ||
				!parent ||
				node.children.length !== 1 ||
				node.children[0]?.type !== "inlineMath"
			) {
				return;
			}

			const inlineMath = node.children[0];
			const start = inlineMath.position?.start.offset;
			const end = inlineMath.position?.end.offset;

			if (
				start === undefined ||
				end === undefined ||
				!source.slice(start, end).startsWith("$$")
			) {
				return;
			}

			parent.children[index] = {
				type: "math",
				value: inlineMath.value,
				data: {
					hName: "pre",
					hChildren: [
						{
							type: "element",
							tagName: "code",
							properties: {
								className: ["language-math", "math-display"],
							},
							children: [{ type: "text", value: inlineMath.value }],
						},
					],
				},
			} satisfies MathNode;

			return SKIP;
		});
	};
};

export function stringifyOneLineMath(node: MathNode): string {
	const latex = node.value.replace(/\r?\n[ \t]*/g, " ").trim();
	return `$$${latex}$$`;
}
