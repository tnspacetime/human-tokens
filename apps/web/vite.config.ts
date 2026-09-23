import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		devtools(),
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		tailwindcss(),
		tanstackStart({
			// Generate static HTML at build time for discovered routes (currently `/`).
			prerender: {
				enabled: true,
				crawlLinks: true,
				autoStaticPathsDiscovery: true,
				failOnError: true,
			},
			pages: [
				{
					path: "/",
					prerender: { enabled: true },
				},
			],
		}),
		viteReact(),
	],
});

export default config;
