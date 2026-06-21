# Changelog

All notable changes to this project will be documented in this file.

This project follows versioned GitHub Action releases. Immutable release tags use full versions such
as `v0.1.0`; major tags such as `v0` may move to the latest compatible release.

## Unreleased

- Add opt-in Issue reproduction draft PR generation for maintainer-approved Issues.
- Add guarded agent configuration for trigger labels, comment commands, allowed paths, blocked
  paths, and size limits.
- Document workflow events and permissions required for reproduction draft PRs.
- Add label-driven rolling Release PRs with automatic semantic version calculation.
- Publish releases when the maintainer-approved Release PR is merged.

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
