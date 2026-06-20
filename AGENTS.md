# Agent Instructions

This file gives Codex and other coding agents durable project guidance for this repository.

## Project Overview

- `maintainer-kit` is a MIT-licensed GitHub Action that turns GitHub Issues and Pull Requests into actionable Decision Briefs.
- The action is human-in-the-loop by default. Do not add behavior that automatically merges PRs, closes Issues, applies labels, pushes commits, or edits repository contents unless the maintainer explicitly asks for that direction.
- Keep repository context specific to `maintainer-kit`. Do not introduce unrelated product, company, customer, grant, sponsorship, or support-application context.

## Development Environment

- Use Node.js 20+ for local development.
- Use pnpm. The repository declares `pnpm@9.15.0` in `package.json`.
- The published GitHub Action runs on the GitHub Actions `node20` runtime.

## Common Commands

- Install dependencies: `pnpm install`
- Typecheck: `pnpm typecheck`
- Test: `pnpm test`
- Lint: `pnpm lint`
- Format check: `pnpm format`
- Bundle the action: `pnpm bundle`
- Build: `pnpm build`

For release readiness or runtime changes, run:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm bundle
git diff --exit-code dist
```

## Source And Generated Files

- Runtime source lives under `src/`.
- Tests live under `tests/`.
- Evaluation fixtures live under `evals/`.
- The GitHub Action entrypoint is `src/index.ts`.
- `action.yml` points to the generated bundle at `dist/index.js`.
- When changing runtime source, dependencies, prompts, schemas, renderers, config loading, privacy filtering, or GitHub publishing behavior, update and verify `dist/index.js` with `pnpm bundle`.
- Do not hand-edit `dist/index.js`; regenerate it from source.

## Documentation

- Keep `README.md` and `README.ja.md` aligned when user-facing behavior, inputs, requirements, examples, or release guidance change.
- Keep `CONTRIBUTING.md`, `RELEASING.md`, `SECURITY.md`, and `CHANGELOG.md` accurate when the related process changes.
- Prefer concrete examples and maintainer-focused wording over marketing copy.

## Testing Expectations

- Add or update tests for changes to config parsing, privacy filtering, diff truncation, prompt inputs, schema validation, rendering, and GitHub comment behavior.
- Keep fixtures synthetic. Do not include real repository data, API keys, tokens, private diffs, or customer/user secrets.
- For documentation-only changes, tests are usually not required unless examples or generated files are affected.

## Privacy And Safety

- Treat this as a public repository. Never commit secrets, tokens, private prompts, private customer context, or local machine paths.
- Preserve secret redaction, file filtering, and diff truncation behavior when changing model inputs.
- Keep model output rendered through structured schemas and local Markdown renderers so comment format remains stable.

## Release And Repository Rules

- Releases are created by the `Release` workflow. Full version tags such as `v0.1.0` are immutable release tags; `v0` is the moving compatibility tag for users.
- `dist/index.js` must be committed before release because JavaScript actions execute the bundle from the selected Git ref.
- The `main` branch is expected to be protected with required CI, up-to-date branches, and at least one approving review.
