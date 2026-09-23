export const interviewPublicIds = {
	miraVale: "G1uhwZEP34SWonzlB3KAWQ",
	theoMartin: "2cEB12VGs9Pm0hHcJvKvyg",
	noorOkafor: "k30brcl5m0L5BfxVQiw4fA",
	rafaelOrtiz: "sBGjnnb3MVWTOsNuJVwN1Q",
	minaSolberg: "Dw6-6wOUM2Iy0P1HxkjzCg",
	imaniBrooks: "rnkFkwYBMcOpmwpVoZchrw",
	junPark: "A3jza8BWUc4s7s6Mpr0Bdw",
	leilaHaddad: "3CExpkseA-fHPghnoACfeQ",
	tomasNovak: "nPyPcZeaiF0EBvBors9uxQ",
	amaraSingh: "9BkZm5DjeuflqZkaJA-Igg",
	eliasChen: "pD7XHqWaA3C9rcPcTEDC1Q",
	sofiaMendes: "Ii2hcCtna6GK3f9ptIcn0g",
} as const;

export const featuredInterviewPublicId = interviewPublicIds.miraVale;

const INTERVIEW_PUBLIC_ID_PATTERN = /^[A-Za-z0-9_-]{22,}$/;

export function isValidInterviewPublicId(publicId: string) {
	return INTERVIEW_PUBLIC_ID_PATTERN.test(publicId);
}

export function getPublicInterviewPortraitUrl(publicId: string) {
	return `/api/v1/interviews/${encodeURIComponent(publicId)}/portrait`;
}

export const interviewGuests = [
	{ publicId: interviewPublicIds.miraVale, guest: "Mira Vale" },
	{ publicId: interviewPublicIds.theoMartin, guest: "Theo Martin" },
	{ publicId: interviewPublicIds.noorOkafor, guest: "Noor Okafor" },
	{ publicId: interviewPublicIds.rafaelOrtiz, guest: "Rafael Ortiz" },
	{ publicId: interviewPublicIds.minaSolberg, guest: "Mina Solberg" },
	{ publicId: interviewPublicIds.imaniBrooks, guest: "Imani Brooks" },
	{ publicId: interviewPublicIds.junPark, guest: "Jun Park" },
	{ publicId: interviewPublicIds.leilaHaddad, guest: "Leila Haddad" },
	{ publicId: interviewPublicIds.tomasNovak, guest: "Tomas Novak" },
	{ publicId: interviewPublicIds.amaraSingh, guest: "Amara Singh" },
	{ publicId: interviewPublicIds.eliasChen, guest: "Elias Chen" },
	{ publicId: interviewPublicIds.sofiaMendes, guest: "Sofia Mendes" },
] as const;
