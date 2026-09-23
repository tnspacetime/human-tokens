import { intro, log, outro, spinner } from "@clack/prompts";
import chalk from "chalk";
import stringWidth from "string-width";

function truncate(value: string, maximumWidth: number) {
	if (stringWidth(value) <= maximumWidth) return value;
	if (maximumWidth <= 1) return "…";

	let result = "";

	for (const character of value) {
		if (stringWidth(`${result}${character}…`) > maximumWidth) break;
		result += character;
	}

	return `${result}…`;
}

function pad(value: string, width: number) {
	return `${value}${" ".repeat(Math.max(0, width - stringWidth(value)))}`;
}

export class Output {
	readonly interactive: boolean;

	constructor({ interactive }: { interactive: boolean }) {
		this.interactive = interactive;
	}

	start(title: string) {
		if (this.interactive) intro(chalk.bold.hex("#f97316")(title));
	}

	done(message = "Done") {
		if (this.interactive) outro(message);
	}

	info(message: string) {
		log.info(message);
	}

	success(message: string) {
		log.success(message);
	}

	warn(message: string) {
		log.warn(message);
	}

	error(message: string) {
		log.error(message);
	}

	line(message = "") {
		console.log(message);
	}

	details(entries: Array<[label: string, value: string | null | undefined]>) {
		const visibleEntries = entries.filter((entry) => entry[1] !== undefined);
		const labelWidth = Math.max(
			...visibleEntries.map(([label]) => stringWidth(label)),
		);

		for (const [label, value] of visibleEntries) {
			console.log(
				`${chalk.dim(pad(label, labelWidth))}  ${value === null || value === "" ? chalk.dim("—") : value}`,
			);
		}
	}

	table({
		headers,
		rows,
		maximumWidths,
	}: {
		headers: string[];
		rows: string[][];
		maximumWidths?: number[];
	}) {
		if (rows.length === 0) return;

		const widths = headers.map((header, columnIndex) => {
			const widest = Math.max(
				stringWidth(header),
				...rows.map((row) => stringWidth(row[columnIndex] ?? "")),
			);
			return Math.min(widest, maximumWidths?.[columnIndex] ?? widest);
		});
		const renderRow = (row: string[]) =>
			row
				.map((cell, columnIndex) => {
					const width = widths[columnIndex] ?? stringWidth(cell);
					return pad(truncate(cell, width), width);
				})
				.join("  ")
				.trimEnd();

		console.log(chalk.bold(renderRow(headers)));
		console.log(chalk.dim(renderRow(widths.map((width) => "─".repeat(width)))));

		for (const row of rows) console.log(renderRow(row));
	}

	async task<T>(message: string, operation: () => Promise<T>) {
		if (!this.interactive) return operation();

		const taskSpinner = spinner();
		taskSpinner.start(message);

		try {
			const result = await operation();
			taskSpinner.stop(message);
			return result;
		} catch (error) {
			taskSpinner.stop(`${message} failed`);
			throw error;
		}
	}
}
