import type { ShareSnapshotPage as ShareSnapshotPageData } from "../../features/share-snapshots/share-snapshot.types";
import BackgroundReadingSection from "../BackgroundReadingSection";
import InterviewArticle from "../InterviewArticle";
import PageContainer from "../PageContainer";

export default function ShareSnapshotPage({
	snapshot,
}: {
	snapshot: ShareSnapshotPageData;
}) {
	if (snapshot.kind === "background_reading") {
		return (
			<main className="min-h-screen bg-[#f5f5f7] text-(--sea-ink) dark:bg-[#1d1d1f]">
				<BackgroundReadingSection backgroundReading={snapshot} standalone />
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-[#f5f5f7] text-(--sea-ink) dark:bg-[#1d1d1f]">
			<section className="relative w-full overflow-hidden bg-transparent text-(--sea-ink)">
				<PageContainer className="relative py-[clamp(4.5rem,10vw,8rem)]">
					<InterviewArticle
						interview={{
							headline: snapshot.title,
							introduction: snapshot.summary,
							introductionHtml: snapshot.summaryHtml,
							contentHtml: snapshot.contentHtml,
						}}
						portraitUrl={snapshot.portraitUrl}
						guest={snapshot.guestName}
						showPortrait={Boolean(snapshot.guestName || snapshot.portraitUrl)}
						standalone
					/>
				</PageContainer>
			</section>
		</main>
	);
}
