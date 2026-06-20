# Contributing to maintainer-kit

Thanks for considering a contribution.

`maintainer-kit` is still early, so focused changes are easiest to review. If you want to change
behavior, prompts, config shape, privacy filtering, or GitHub publishing behavior, please open an
Issue first so we can align on the direction.

## Development Setup

Requirements:

- Node.js 20+
- pnpm

Install dependencies:

```bash
pnpm install
```

Run checks:

```bash
pnpm typecheck
pnpm test
pnpm bundle
```

## Pull Requests

- Keep PRs small and focused.
- Include tests when changing config, privacy filtering, diff truncation, rendering, or GitHub
  comment behavior.
- Do not include real repository data, API keys, tokens, or sensitive diffs in fixtures.
- Keep `dist/index.js` updated when changing runtime code intended for a release.

## Project Boundaries

`maintainer-kit` should remain human-in-the-loop by default. Changes that automatically merge PRs,
close Issues, apply labels, push commits, or edit repository contents should be discussed before
implementation.
