import { createFileRoute } from "@tanstack/react-router";

const manifest = {
	name: "Human Tokens",
	short_name: "Human Tokens",
	description: "Pure human tokens: authentic and unprompted.",
	start_url: "/",
	icons: [
		{
			src: "/android-chrome-192x192.png",
			sizes: "192x192",
			type: "image/png",
		},
		{
			src: "/android-chrome-512x512.png",
			sizes: "512x512",
			type: "image/png",
		},
	],
	theme_color: "#000000",
	background_color: "#ffffff",
	display: "standalone",
};

export const Route = createFileRoute("/site.webmanifest")({
	server: {
		handlers: {
			GET: () =>
				new Response(JSON.stringify(manifest, null, 2), {
					headers: {
						"Content-Type": "application/manifest+json",
						"Cache-Control": "public, max-age=3600",
					},
				}),
		},
	},
});
