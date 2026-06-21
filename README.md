# maintainer-kit

Language: English | [日本語](README.ja.md)

`maintainer-kit` is a GitHub Action that helps maintainers turn GitHub Issues and Pull Requests
into actionable Decision Briefs, and can turn maintainer-approved Issues into small draft
reproduction PRs.

It helps humans answer the questions that often slow down maintenance work:

- What is this Issue or PR actually about?
- What decision is needed before it moves forward?
- What context is missing?
- Which product or repository areas might be affected?
- Who should review it?
- What QA or release checks are worth doing?
- What response should a maintainer send next?

## Table Of Contents

- [Status](#status)
- [Features](#features)
- [When To Use It](#when-to-use-it)
- [What It Produces](#what-it-produces)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Repository Context](#repository-context)
- [Reproduction Draft PRs](#reproduction-draft-prs)
- [CI Fix Draft PRs](#ci-fix-draft-prs)
- [Inputs](#inputs)
- [Behavior](#behavior)
- [Privacy And Safety](#privacy-and-safety)
- [Getting Help](#getting-help)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)
- [Release](#release)
- [Development](#development)

## Status

`maintainer-kit` is public, MIT-licensed, and usable from GitHub Actions via the `v0` tag.

The repository includes the generated `dist/index.js` bundle required by the GitHub Action runtime.

The project is currently in the 0.x release line. Prompts, config, and output details may evolve
before a 1.0 release.

## Features

- Issue Intake Briefs for `issues.opened` and `issues.edited`
- PR Decision Briefs for `pull_request.opened`, `pull_request.synchronize`, and
  `pull_request.reopened`
- maintainer-approved reproduction draft PRs from Issues
- maintainer-approved focused CI fix draft PRs from failed GitHub Actions runs
- repository context config via `.maintainer-kit.yml`
- stable Markdown rendering from structured model output
- English and Japanese brief comments
- create, update, or skip comment publishing
- dry-run mode for testing workflows safely
- guarded branch, commit, push, and draft PR creation for explicitly enabled agent tasks
- secret redaction, file filtering, and diff truncation before model calls
- non-mutating default behavior

## When To Use It

Use `maintainer-kit` when your repository receives Issues or PRs that are technically valid but
operationally unclear.

Good fits:

- OSS projects that want a consistent first-pass triage comment
- product teams that need PM, QA, design, backend, or release-owner context before merging
- maintainers who want contributor-friendly response drafts
- repositories where PRs often affect docs, public APIs, billing, auth, CLI behavior, generated
  files, release notes, or compatibility

Not a fit:

- replacing human maintainers
- security scanning
- unapproved automatic fixes, merges, labels, or issue closure

## What It Produces

For Issues, it posts an Issue Intake Brief:

```md
## Maintainer Kit Issue Intake Brief

This is an AI-generated Issue Intake Brief. Please review before taking action.

### Issue Type

Bug

### Summary

The issue reports a login failure, but does not include reproduction steps or environment details.

### Actionability

Low

### Missing Context

- Reproduction steps
- Expected behavior
- Actual behavior
- Version and environment

### Suggested Next Action

Ask the reporter for reproduction details before investigation.
```

For Pull Requests, it posts a PR Decision Brief:

```md
## Maintainer Kit Decision Brief

This is an AI-generated Decision Brief. Please review before taking action.

### Summary

This PR changes report export behavior for workspace admins.

### Decision Needed

Confirm whether the new behavior applies to all workspaces or only workspaces with advanced
reporting enabled.

### Impact Map

**User flows**

- Report export
- Admin settings

**Product / repository areas**

- Reporting dashboard
- Export API

### QA Checklist

- [ ] Admin can export a report with default filters.
- [ ] Admin can export a report with custom filters.
- [ ] Permission-denied state is handled.
```

The model returns structured JSON. `maintainer-kit` renders the final Markdown itself, so the
comment format stays stable.

## Requirements

- GitHub Actions
- `contents: read`, `issues: write`, and `pull-requests: write` workflow permissions
- `contents: write` when a draft PR agent feature is enabled
- `actions: read` when `ci_fix_pr` is enabled
- an OpenAI API key stored as `OPENAI_API_KEY`
- a published `maintainer-kit` release tag with a bundled `dist/index.js`

## Quick Start

Create `.github/workflows/maintainer-kit.yml`:

```yaml
name: Maintainer Kit

on:
  issues:
    types: [opened, edited]
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  issues: write
  pull-requests: write

jobs:
  decision-brief:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: joj0hq/maintainer-kit@v0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          config-path: .maintainer-kit.yml
          mode: suggest
```

Add `OPENAI_API_KEY` to your repository or organization secrets.

Brief comments are generated in English by default. Set `output-language: ja`, or configure
`language.output: ja`, to post Japanese comments.

## Repository Context

Configuration is optional. If `.maintainer-kit.yml` is missing, safe OSS-oriented defaults are
used.

Add a config file when you want the brief to understand your repository areas, sensitive flows,
metrics, or reviewer roles:

```yaml
project:
  name: example-library
  type: oss
  domain: developer_tooling
  platforms:
    - node
    - cli

features:
  issue_intake_brief: true
  pr_decision_brief: true
  issue_reproduction_pr: false
  ci_fix_pr: false
  release_readiness_brief: false

agent:
  issue_reproduction_pr:
    trigger_label: maintainer-kit:repro
    trigger_comment: /maintainer-kit repro
    branch_prefix: maintainer-kit
    allowed_paths:
      - tests/**
      - fixtures/**
      - docs/**
      - examples/**
  ci_fix_pr:
    trigger_comment: /maintainer-kit fix-ci
    branch_prefix: maintainer-kit
    allowed_paths:
      - src/**
      - tests/**
      - docs/**
      - scripts/**

behavior:
  comment_mode: update
  auto_label: false
  auto_close: false
  dry_run: false

model:
  provider: openai
  name: gpt-4.1-mini
  max_input_tokens: 12000

language:
  output: en

metrics:
  primary:
    - weekly_active_users
    - task_completion_rate
  secondary:
    - trial_conversion
    - report_export_rate

critical_flows:
  - install
  - configuration
  - cli_execution
  - api_compatibility

sensitive_areas:
  - breaking_change
  - security
  - performance
  - public_api
  - documentation

roles:
  maintainer:
    required_for:
      - breaking_change
      - public_api
      - release
  docs:
    required_for:
      - documentation
      - examples

privacy:
  max_diff_lines: 800
  max_diff_chars: 50000
  redact_secrets: true
  exclude_files:
    - package-lock.json
    - pnpm-lock.yaml
    - yarn.lock
    - "*.min.js"
```

See [.maintainer-kit.example.yml](.maintainer-kit.example.yml) for a fuller example.

## Reproduction Draft PRs

`maintainer-kit` can also turn maintainer-approved Issues into small draft PRs. This feature is
disabled by default because it creates branches, commits, pushes, and pull requests.

Enable it explicitly:

```yaml
features:
  issue_reproduction_pr: true

agent:
  issue_reproduction_pr:
    trigger_label: maintainer-kit:repro
    trigger_comment: /maintainer-kit repro
    allowed_paths:
      - tests/**
      - fixtures/**
      - docs/**
      - examples/**
```

Trigger it with either:

- the configured label, for example `maintainer-kit:repro`
- the configured issue comment command, for example `/maintainer-kit repro`, posted by a trusted
  repository actor (`OWNER`, `MEMBER`, or `COLLABORATOR`)

The generated PR is always a draft. The MVP intentionally aims for a reproduction or failing
regression case first, not a full fix. It refuses generated files outside configured allowed paths,
blocked paths, existing files, oversized files, and content that looks like a secret.

Workflow events:

```yaml
on:
  issues:
    types: [opened, edited, labeled]
  issue_comment:
    types: [created]
```

Recommended workflow permissions:

```yaml
permissions:
  actions: read
  contents: write
  issues: write
  pull-requests: write
```

## CI Fix Draft PRs

`maintainer-kit` can turn a failed GitHub Actions run into a small stacked draft PR. This feature is
disabled by default.

```yaml
features:
  ci_fix_pr: true

agent:
  ci_fix_pr:
    trigger_comment: /maintainer-kit fix-ci
    allowed_paths:
      - src/**
      - tests/**
      - docs/**
      - scripts/**
```

When an `OWNER`, `MEMBER`, or `COLLABORATOR` comments `/maintainer-kit fix-ci` on an open pull
request, the action:

1. finds the latest failed `pull_request` workflow run for that PR
2. downloads only failed job logs
3. redacts and truncates logs before the model call
4. checks out the current PR head without running repository code
5. generates a guarded, focused change
6. opens a stacked draft PR targeting the original PR branch

The MVP supports same-repository PRs only. Fork PRs remain read-only. It does not execute
contributor-controlled code or model-generated commands in the privileged repair job; normal CI on
the generated draft PR performs validation.

To let the generated PR trigger normal workflows, pass a fine-grained PAT or GitHub App token as
`github-token`. Pull requests created with the default Actions `GITHUB_TOKEN` do not trigger new
workflow runs. Grant Actions read plus Contents, Issues, and Pull requests read/write access, and
limit the token to the target repository.

```yaml
on:
  issue_comment:
    types: [created]

permissions:
  actions: read
  contents: write
  issues: write
  pull-requests: write

steps:
  - uses: actions/checkout@v7
  - uses: joj0hq/maintainer-kit@v0
    with:
      github-token: ${{ secrets.MAINTAINER_KIT_TOKEN }}
      openai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

## Inputs

| Input             | Required | Default               | Description                                                             |
| ----------------- | -------- | --------------------- | ----------------------------------------------------------------------- |
| `github-token`    | yes      |                       | Token used to read Issues/PRs and post comments.                        |
| `openai-api-key`  | yes      |                       | OpenAI API key used to generate briefs and guarded draft PR content.    |
| `config-path`     | no       | `.maintainer-kit.yml` | Path to the repository context config.                                  |
| `mode`            | no       | `suggest`             | Supported values: `suggest`, `dry-run`.                                 |
| `comment-mode`    | no       | `update`              | Supported values: `create`, `update`, `none`.                           |
| `model`           | no       | config value          | Model override. If omitted and config is empty, `gpt-4.1-mini` is used. |
| `output-language` | no       | config value          | Brief comment language. Supported values: `en`, `ja`.                   |

## Behavior

| Event                      | Result                                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `issues.opened`            | Creates or updates an Issue Intake Brief.                                                                            |
| `issues.edited`            | Creates or updates an Issue Intake Brief.                                                                            |
| `issues.labeled`           | Creates a reproduction draft PR when `issue_reproduction_pr` is enabled and the configured trigger label is applied. |
| `issue_comment.created`    | Runs an enabled reproduction or CI-fix command posted by a trusted maintainer.                                       |
| `pull_request.opened`      | Creates or updates a PR Decision Brief.                                                                              |
| `pull_request.synchronize` | Creates or updates a PR Decision Brief with the latest changed files.                                                |
| `pull_request.reopened`    | Creates or updates a PR Decision Brief.                                                                              |
| Unsupported events         | Exit successfully without posting a comment.                                                                         |

Comment modes:

- `update`: update the previous `maintainer-kit` bot comment if it exists, otherwise create one.
- `create`: always create a new comment.
- `none`: do not post a comment.

Execution modes:

- `suggest`: generate the brief and publish according to `comment-mode`.
- `dry-run`: generate the brief, print it to logs, and do not post a GitHub comment.

## Privacy And Safety

Before sending context to the model, `maintainer-kit`:

- filters generated, binary, lockfile, image, archive, and configured excluded files
- truncates large diffs by line and character limits
- redacts common secrets such as GitHub tokens, OpenAI API keys, bearer tokens, private keys,
  database URLs, environment variable assignments, and high-entropy strings
- logs only non-sensitive execution metadata

By default, the action does not:

- push commits
- create branches
- merge PRs
- close Issues
- apply labels by default
- delete human comments
- store private data outside the GitHub Actions runtime

When `features.issue_reproduction_pr` is explicitly enabled and a trusted trigger is used, the
action can create a branch, commit generated reproduction files, push the branch, and open a draft
PR. It still does not merge PRs, close Issues, or edit files outside configured allowed paths.

When `features.ci_fix_pr` is enabled, the action can read failed GitHub Actions logs and create a
stacked draft PR for a same-repository PR. It does not run contributor-controlled code in the
privileged repair job.

## Project Status

This repository contains the TypeScript source, tests, and generated `dist/index.js` bundle for the
Action runtime. CI verifies that the committed bundle stays in sync with source changes.

## Getting Help

Open a GitHub Issue with:

- the event type (`issues.opened`, `pull_request.synchronize`, etc.)
- your workflow snippet
- your `.maintainer-kit.yml` with secrets removed
- the generated Action logs, if available

Please do not include API keys, tokens, private repository content, or full sensitive diffs in
issues.

## Contributing

Contributions are welcome while the project is small and still taking shape.

See [CONTRIBUTING.md](CONTRIBUTING.md).

The `main` branch is intended to be protected with required CI, release-label validation, and one
approving review.
Maintainers can apply the expected GitHub branch protection with
[`scripts/apply-main-branch-protection.sh`](scripts/apply-main-branch-protection.sh).

## Security

Please do not report security-sensitive issues in public Issues. See [SECURITY.md](SECURITY.md).

## License

MIT License. See [LICENSE](LICENSE).

## Release

Every normal PR must have exactly one of `release:patch`, `release:minor`, `release:major`, or
`release:none`.

After a releasable PR merges, the `Prepare Release` workflow creates or updates one rolling
`release/next` draft PR. It calculates the next version from the highest included release label and
updates `package.json` and `CHANGELOG.md`.

Merging the rolling Release PR publishes the immutable full tag and GitHub Release, then moves the
major and minor compatibility tags. No manual version input is required.

Initial repository setup requires:

- running the `Setup Release Labels` workflow
- configuring a `RELEASE_TOKEN` Actions secret so Release PRs trigger normal CI

Before publishing, maintainers should verify:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm lint
pnpm bundle
git diff --exit-code dist
```

See [RELEASING.md](RELEASING.md) for the full release checklist.

## Development

Requirements:

- Node.js 20+ for local development
- pnpm

The published GitHub Action runs on the GitHub Actions `node20` runtime declared in
[`action.yml`](action.yml). The repository CI and release workflows use `actions/setup-node@v6` to
install Node.js 20 for checks.

Commands:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

Useful files:

- [action.yml](action.yml): GitHub Action metadata and inputs
- [src/index.ts](src/index.ts): Action entrypoint
- [src/config/defaultConfig.ts](src/config/defaultConfig.ts): safe defaults
- [src/privacy](src/privacy): file filtering, redaction, and diff truncation
- [src/render](src/render): stable Markdown rendering
- [tests](tests): focused unit tests for config, privacy, truncation, and rendering
