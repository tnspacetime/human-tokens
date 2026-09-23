import {
	HeadContent,
	Scripts,
	createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import Footer from "../components/Footer";
import Header from "../components/Header";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";

import type { QueryClient } from "@tanstack/react-query";
import { seo } from "../lib/seo";

interface MyRouterContext {
	queryClient: QueryClient;
}

const SITE_URL = "https://human-tokens.dev";
const SITE_TITLE = "Human Tokens";
const SITE_DESCRIPTION = "Pure human tokens: authentic and unprompted.";

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				name: "theme-color",
				content: "#000000",
			},
			{
				name: "author",
				content: "Human Tokens",
			},
			{
				name: "robots",
				content: "index, follow",
			},
			...seo({
				title: SITE_TITLE,
				description: SITE_DESCRIPTION,
				keywords:
					"human tokens, interviews, technical interviews, developers, researchers, authentic conversations",
				url: SITE_URL,
				siteUrl: SITE_URL,
				image: `${SITE_URL}/og.png`,
			}),
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "canonical",
				href: SITE_URL,
			},
			{
				rel: "icon",
				href: "/favicon.svg?v=1",
				type: "image/svg+xml",
			},
			{
				rel: "icon",
				type: "image/png",
				sizes: "32x32",
				href: "/favicon-32x32.png?v=1",
			},
			{
				rel: "icon",
				type: "image/png",
				sizes: "16x16",
				href: "/favicon-16x16.png?v=1",
			},
			{
				rel: "shortcut icon",
				href: "/favicon.ico?v=1",
			},
			{
				rel: "apple-touch-icon",
				sizes: "180x180",
				href: "/apple-touch-icon.png?v=1",
			},
			{
				rel: "manifest",
				href: "/site.webmanifest",
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
				<HeadContent />
			</head>
			<body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(41,151,255,0.22)]">
				<div className="flex min-h-screen flex-col bg-[var(--bg-base)] text-[var(--sea-ink)]">
					<Header />
					<div className="flex min-h-0 flex-1 flex-col">{children}</div>
					<Footer />
				</div>
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						TanStackQueryDevtools,
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
