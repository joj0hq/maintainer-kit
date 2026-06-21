# Contributing to maintainer-kit

Thanks for considering a contribution.

`maintainer-kit` is still early, so focused changes are easiest to review. If you want to change
behavior, prompts, config shape, privacy filtering, or GitHub publishing behavior, please open an
Issue first so we can align on the direction.

## Development Setup

Requirements:

- Node.js 20+ for local development
- pnpm

The published GitHub Action uses the GitHub Actions `node20` runtime. Repository workflows install
Node.js 20 with `actions/setup-node@v6` before running checks.

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

## Repository Protection

The `main` branch should stay protected for OSS contributions:

- require pull requests before merging
- require the `test` status check to pass
- require the `release-label` status check to pass
- require branches to be up to date before merging
- require 1 approving review
- dismiss stale approvals when new commits are pushed

Maintainers can apply the expected branch protection with:

```bash
GITHUB_TOKEN=... scripts/apply-main-branch-protection.sh
```

The token must have repository administration write permission. By default, administrators can
bypass the protection so a solo maintainer does not get locked out. Use `ENFORCE_ADMINS=true` when
there is another maintainer who can approve owner-authored pull requests.

## Pull Requests

- Keep PRs small and focused.
- Add exactly one release label:
  - `release:patch` for backward-compatible fixes, docs, and maintenance
  - `release:minor` for backward-compatible features
  - `release:major` for breaking releases or an explicit 1.0 release
  - `release:none` when no versioned release is needed
- Include tests when changing config, privacy filtering, diff truncation, rendering, or GitHub
  comment behavior.
- Do not include real repository data, API keys, tokens, or sensitive diffs in fixtures.
- Keep `dist/index.js` updated when changing runtime code intended for a release.

## Dependency Updates

Renovate is configured in [`.github/renovate.json`](.github/renovate.json) to monitor npm, pnpm,
and GitHub Actions dependencies. A repository owner must install the
[Renovate GitHub App](https://github.com/apps/renovate) for the configuration to run.

Renovate opens draft pull requests and does not automerge, apply release labels, or create a
Dependency Dashboard Issue. Before marking a Renovate PR ready for review:

- review the dependency changelog and compatibility impact
- run the normal checks
- for npm or pnpm updates, run `pnpm bundle` and commit any changed `dist/index.js`
- apply the appropriate `release:*` label, usually `release:patch` for dependency maintenance

## Project Boundaries

`maintainer-kit` should remain human-in-the-loop by default. Changes that automatically merge PRs,
close Issues, apply labels, push commits, or edit repository contents should be discussed before
implementation.
