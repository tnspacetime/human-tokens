import MarkdownIt, { type StateBlock, type StateInline } from "markdown-it";

function isEscaped(source: string, position: number) {
	let backslashes = 0;

	for (
		let index = position - 1;
		index >= 0 && source[index] === "\\";
		index--
	) {
		backslashes++;
	}

	return backslashes % 2 === 1;
}

function mathInline(state: StateInline, silent: boolean): boolean {
	const start = state.pos;

	if (
		state.src[start] !== "$" ||
		state.src[start + 1] === "$" ||
		/\s/.test(state.src[start + 1] ?? "")
	) {
		return false;
	}

	let end = state.src.indexOf("$", start + 1);

	while (end !== -1) {
		if (!isEscaped(state.src, end)) {
			break;
		}

		end = state.src.indexOf("$", end + 1);
	}

	if (end === -1 || end === start + 1 || /\s/.test(state.src[end - 1] ?? "")) {
		return false;
	}

	if (!silent) {
		const token = state.push("math_inline", "math", 0);
		token.content = state.src.slice(start + 1, end);
	}

	state.pos = end + 1;
	return true;
}

function mathBlock(
	state: StateBlock,
	startLine: number,
	endLine: number,
	silent: boolean,
): boolean {
	const start = state.bMarks[startLine] + state.tShift[startLine];
	const lineEnd = state.eMarks[startLine];

	if (state.src.slice(start, start + 2) !== "$$") {
		return false;
	}

	const openingLine = state.src.slice(start + 2, lineEnd);
	const openingClose = openingLine.match(/\$\$\s*$/);
	let source = "";
	let nextLine = startLine;

	if (openingClose) {
		source = openingLine.slice(0, openingClose.index).trim();
	} else {
		const lines = [openingLine];
		let foundClosingFence = false;

		for (nextLine = startLine + 1; nextLine < endLine; nextLine++) {
			const nextStart = state.bMarks[nextLine] + state.tShift[nextLine];
			const nextEnd = state.eMarks[nextLine];
			const line = state.src.slice(nextStart, nextEnd);
			const closingFence = line.match(/\$\$\s*$/);

			if (closingFence) {
				lines.push(line.slice(0, closingFence.index));
				foundClosingFence = true;
				break;
			}

			lines.push(line);
		}

		if (!foundClosingFence) {
			return false;
		}

		source = lines.join("\n").trim();
	}

	if (silent) {
		return true;
	}

	const token = state.push("math_block", "math", 0);
	token.block = true;
	token.content = source;
	token.map = [startLine, nextLine + 1];
	state.line = nextLine + 1;
	return true;
}

export function createMathMarkdownTokenizer() {
	const tokenizer = MarkdownIt("commonmark", { html: false });
	tokenizer.inline.ruler.after("escape", "math_inline", mathInline);
	tokenizer.block.ruler.before("fence", "math_block", mathBlock, {
		alt: ["paragraph", "reference", "blockquote", "list"],
	});
	return tokenizer;
}
