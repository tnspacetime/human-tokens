const DEFAULT_OG_IMAGE = "/og.png";
const OG_IMAGE_WIDTH = "1200";
const OG_IMAGE_HEIGHT = "630";

function absoluteUrl(path: string, siteUrl?: string) {
	if (/^https?:\/\//i.test(path)) {
		return path;
	}

	const base = (
		siteUrl ?? (import.meta.env.VITE_SITE_URL as string | undefined)
	)?.replace(/\/$/, "");

	if (!base) {
		return path.startsWith("/") ? path : `/${path}`;
	}

	return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export const seo = ({
	title,
	description,
	keywords,
	image,
	url,
	siteUrl,
	type = "website",
	siteName = "Human Tokens",
}: {
	title: string;
	description?: string;
	image?: string;
	keywords?: string;
	url?: string;
	siteUrl?: string;
	type?: "website" | "article";
	siteName?: string;
}) => {
	const ogImage = absoluteUrl(image ?? DEFAULT_OG_IMAGE, siteUrl);
	const ogUrl = url ? absoluteUrl(url, siteUrl) : undefined;

	const tags = [
		{ title },
		...(description ? [{ name: "description", content: description }] : []),
		...(keywords ? [{ name: "keywords", content: keywords }] : []),
		{ name: "twitter:title", content: title },
		...(description
			? [{ name: "twitter:description", content: description }]
			: []),
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:image", content: ogImage },
		{ property: "og:type", content: type },
		{ property: "og:title", content: title },
		...(description
			? [{ property: "og:description", content: description }]
			: []),
		{ property: "og:site_name", content: siteName },
		{ property: "og:image", content: ogImage },
		{ property: "og:image:type", content: "image/png" },
		{ property: "og:image:width", content: OG_IMAGE_WIDTH },
		{ property: "og:image:height", content: OG_IMAGE_HEIGHT },
		{ property: "og:image:alt", content: siteName },
		...(ogUrl ? [{ property: "og:url", content: ogUrl }] : []),
	];

	return tags;
};
