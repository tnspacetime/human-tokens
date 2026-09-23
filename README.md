# Human Tokens

Human Tokens is a collection of apps for publishing and reading interviews.
Each app manages its own Bun dependencies and lockfile; the repository root is not a Bun workspace.

| Directory | Purpose |
| --- | --- |
| `apps/software-web` | Software interview website, public API, and protected curation API |
| `apps/curation-cli` | Interactive client for the protected curation API |
| `apps/software-mobile` | Mobile interview reader |
| `apps/web` | Separate web app |

Start with the README in the app you want to run. Local credentials belong in `.env.local` and are excluded from Git. The example environment files contain placeholders only.

## License

MIT. See [LICENSE](LICENSE).
