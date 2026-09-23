import type { PublishedInterview } from "../features/publications/publication.types";
import InterviewArticle from "./InterviewArticle";
import PageContainer from "./PageContainer";

export default function InterviewSection({
	interview,
	reducedMotion,
	standalone = false,
}: {
	interview: PublishedInterview;
	reducedMotion?: boolean;
	standalone?: boolean;
}) {
	return (
		<section
			id="interview"
			className="relative w-full scroll-mt-16 overflow-hidden bg-transparent text-(--sea-ink)"
		>
			<PageContainer className="relative py-[clamp(4.5rem,10vw,8rem)]">
				<InterviewArticle
					interview={interview}
					portraitUrl={interview.portraitUrl}
					guest={interview.guest}
					publication={{
						publicId: interview.publicId,
						date: interview.date,
						displayDate: interview.displayDate,
					}}
					showPortrait
					reducedMotion={reducedMotion}
					standalone={standalone}
				/>
			</PageContainer>
		</section>
	);
}
