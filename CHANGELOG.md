# Changelog

All notable changes to this project will be documented in this file.

This project follows versioned GitHub Action releases. Immutable release tags use full versions such
as `v0.1.0`; major tags such as `v0` may move to the latest compatible release.

## Unreleased

No unreleased changes.

## 0.3.2 - 2026-06-21

- Add Renovate configuration for draft, human-reviewed npm, pnpm, and GitHub Actions dependency
  updates.
- #13 [codex] Add Renovate dependency updates

## 0.3.1 - 2026-06-21

- #10 [codex] Prepare OSS readiness and dogfood materials

## 0.3.0 - 2026-06-21

- Add opt-in `/maintainer-kit fix-ci` support for creating focused stacked draft PRs from failed
  GitHub Actions runs.
- Add failed job log redaction, truncation, same-repository restrictions, and path guardrails for CI
  repair.
- #5 [codex] Add focused CI fix draft PRs
- #7 test: add unit tests for markdown rendering and matchGlob

## 0.2.0 - 2026-06-21

- Add opt-in Issue reproduction draft PR generation for maintainer-approved Issues.
- Add guarded agent configuration for trigger labels, comment commands, allowed paths, blocked
  paths, and size limits.
- Document workflow events and permissions required for reproduction draft PRs.
- Add label-driven rolling Release PRs with automatic semantic version calculation.
- Publish releases when the maintainer-approved Release PR is merged.
- #3 [codex] Automate rolling release pull requests

## 0.1.0 - 2026-06-20

- Initial Maintainer Kit GitHub Action.
- Issue Intake Briefs for supported Issue events.
- PR Decision Briefs for supported Pull Request events.
- English and Japanese output for generated brief comments.
- Configurable repository context through `.maintainer-kit.yml`.
- Secret redaction, file filtering, and diff truncation before model calls.
- Stable Markdown rendering and updateable GitHub comments.
- Versioned GitHub Action release workflow with immutable full version tags, GitHub Releases, and
  moving major tags.
