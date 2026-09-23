# Human Tokens Curation Shell

An interactive command shell for the protected Human Tokens curation API. Start it once, run as many curation commands as needed, and leave with `exit`.

The shell is an HTTP client. It never connects to Postgres directly and never imports application code from `software-web`.

## Setup

```bash
bun install
cp .env.example .env.local
```

Configure the API origin and master curation credential in `.env.local`:

```dotenv
CURATION_API_URL=http://localhost:3000
CURATION_API_TOKEN=replace-with-your-curation-token
```

The shell reads `.env.local` and then `.env` from the directory where it is started, without overriding variables already present in the process environment. The token is intentionally not accepted as a command-line argument because process arguments may be visible to other local processes.

`CURATION_API_URL` defaults to `http://localhost:3000`. For local use, start `software-web` in another terminal:

```bash
cd /Users/tnspacetime/Apps/human-tokens/apps/software-web
bun run dev
```

For production, set `CURATION_API_URL` to the deployed `software-web` origin and use its matching curation token. A local server is not required in that configuration.

## Start a session

Run the source directly during development:

```bash
bun run dev
```

Or build and run the local compiled program:

```bash
bun run build
bun run start
```

Then enter commands directly at its prompt:

```text
Human Tokens Curation
Connected to http://localhost:3000

human-tokens > guest list
human-tokens > guest find "Ada Lovelace"
human-tokens > interview list
human-tokens > version
human-tokens > exit
Session closed
```

Configuration and the authenticated API client are loaded once per session. A failed command reports its error and returns to the prompt instead of closing the program. Command history is available with the up and down arrow keys, and Tab completes command names.

The program intentionally does not support one-shot invocation such as `bun run dev -- guest list` or piped input. It requires an interactive terminal.

## Session controls

```text
help                  List commands
help guest            Show guest command help
interview show --help Show help for one command
clear                 Clear the terminal
version               Show the program version
exit                  Close the session
quit                  Close the session
```

Arguments containing spaces can be quoted. The shell parses quoting and escaping, but it does not execute operating-system shell syntax. Operators, comments, and wildcard expansion are rejected.

## Draft commands

Create an interview draft:

```text
draft create interview
```

Create a background-reading draft:

```text
draft create background
```

Choose the kind interactively by omitting it:

```text
draft create
```

Set the expiration period or open the new link immediately:

```text
draft create interview --expires-in-days 30 --open
```

Open a draft URL returned earlier:

```text
draft open "https://your-production-origin.example/draft/RAW_TOKEN"
```

## Guest commands

Create a guest with interactive prompts:

```text
guest create
```

Or provide both values in the command:

```text
guest create --name "Ada Lovelace" --description "Mathematician and writer"
```

List, search, or find guest records:

```text
guest list
guest list --query "Ada"
guest find "Ada Lovelace"
```

List and find commands follow every API cursor automatically. `--page-size` controls the number of records requested per API call, up to 200:

```text
guest list --page-size 100
```

## Interview commands

List or search interviews:

```text
interview list
interview list --query "computing"
```

Inspect one complete administrative interview record:

```text
interview show "d8d7786d-b6ba-4438-9ea8-dda75aa7e94c"
```

Attach an existing guest:

```text
interview attach-guest "d8d7786d-b6ba-4438-9ea8-dda75aa7e94c" "8da4c91a-c7ac-4f73-88f1-7e7e9de6530c"
```

If the interview already has a different guest, the shell asks for confirmation. Use `--yes` to skip that confirmation deliberately:

```text
interview attach-guest "d8d7786d-b6ba-4438-9ea8-dda75aa7e94c" "8da4c91a-c7ac-4f73-88f1-7e7e9de6530c" --yes
```

## Publish commands

Publish one ready interview together with one ready background reading:

```text
publish pair "d8d7786d-b6ba-4438-9ea8-dda75aa7e94c" "5a7d9cd6-1d71-449f-bf9c-7064c7863380"
```

The command calls `POST /api/v1/admin/publish` with the `pair` scheme and uses the same `CURATION_API_TOKEN` as every other CLI command.

## Export commands

Export a published pair into two Markdown files:

```text
export pair "G1uhwZEP34SWonzlB3KAWQ" --out ./content
```

The argument is the interview's public ID, which the publish command prints after a successful publication. The command writes files named with the pair's original publication date:

```text
content/2026-09-09-interview.md
content/2026-09-09-background-reading.md
```

Both files contain YAML front matter with the original publication date, followed by the title, Markdown summary, and complete Markdown content. The interview file also includes the guest name. Existing files are preserved unless replacement is explicitly requested:

```text
export pair "G1uhwZEP34SWonzlB3KAWQ" --out ./content --force
```

The export command only writes local files. It does not run Git commands or push anything to GitHub.

## Share commands

Create a standalone, fixed copy of an interview or background reading:

```text
share create interview "d8d7786d-b6ba-4438-9ea8-dda75aa7e94c"
share create background-reading "5a7d9cd6-1d71-449f-bf9c-7064c7863380"
```

The command prints the public share URL and its snapshot ID. The copy does not change when the source is edited.

Revoke the link later with the printed snapshot ID:

```text
share revoke "378d2923-6619-4625-a72d-3d9c556cd028"
```

Revocation makes the public URL unavailable and purges its cached response.

## Development

Run the source shell:

```bash
bun run dev
```

Run every quality check:

```bash
bun run check
```

This runs Biome, TypeScript, the test suite, and the distributable build.
