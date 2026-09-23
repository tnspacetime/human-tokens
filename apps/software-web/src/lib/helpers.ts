export function formatLocalRevisionTimestamp(revision: string) {
	const timestamp = new Date(revision);

	if (Number.isNaN(timestamp.getTime())) {
		return "an unknown time";
	}

	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
		timeZoneName: "short",
	}).format(timestamp);
}
