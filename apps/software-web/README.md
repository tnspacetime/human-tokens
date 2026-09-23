# Human Tokens Software Web

The software interview website is a TanStack Start app deployed as a Cloudflare Worker. It serves interviews, a public API, and a protected curation API.

## Local development

From this directory:

```bash
bun install
cp .env.example .env.local
bun run dev
```

Set `DATABASE_URL` and `CURATION_API_TOKEN` in `.env.local` before using the database or curation features. Keep that file private. The [curation CLI](../curation-cli/README.md) provides commands for creating drafts, managing guests, publishing, and exporting Markdown.

## Checks

```bash
bun run check
bun test
bun run build
```

## Deployment

`wrangler.jsonc` contains resource IDs for the Human Tokens Cloudflare account. Replace those IDs and configure the required Worker secrets in your own account before deploying a fork. The deploy script builds the app and runs Wrangler:

```bash
bun run deploy
```
