# Changelog

All notable changes to this project will be documented in this file.

This project follows versioned GitHub Action releases. Immutable release tags use full versions such
as `v0.1.0`; major tags such as `v0` may move to the latest compatible release.

## Unreleased

- Add Japanese output support for generated Issue Intake and PR Decision Brief comments.

## 0.1.0 - 2026-06-20

- Initial Maintainer Kit GitHub Action.
- Issue Intake Briefs for supported Issue events.
- PR Decision Briefs for supported Pull Request events.
- Configurable repository context through `.maintainer-kit.yml`.
- Secret redaction, file filtering, and diff truncation before model calls.
- Stable Markdown rendering and updateable GitHub comments.
