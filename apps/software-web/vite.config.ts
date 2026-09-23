import { createRequire } from "node:module";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const require = createRequire(import.meta.url);
const shikiOnigurumaWasm = require.resolve("shiki/onig.wasm");

const config = defineConfig({
	resolve: {
		alias: [
			{
				find: /^shiki\/wasm$/,
				replacement: shikiOnigurumaWasm,
			},
		],
		tsconfigPaths: true,
	},
	plugins: [
		devtools(),
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
});

export default config;
