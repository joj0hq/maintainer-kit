# maintainer-kit

Language: English | [日本語](README.ja.md)

`maintainer-kit` turns GitHub Issues and Pull Requests into actionable Decision Briefs for
maintainers and product teams.

It is not an AI code reviewer. It focuses on what the team should understand, verify, ask, and
decide before moving an Issue or PR forward.

## Usage

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
      - uses: actions/checkout@v4
      - uses: your-org/maintainer-kit@v0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          config-path: .maintainer-kit.yml
          mode: suggest
```

## Configuration

Configuration is optional. If `.maintainer-kit.yml` is missing, safe OSS-oriented defaults are
used.

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
  release_readiness_brief: false

behavior:
  comment_mode: update
  auto_label: false
  auto_close: false
  dry_run: false

model:
  provider: openai
  name: gpt-4.1-mini
  max_input_tokens: 12000

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
```

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `github-token` | yes | | Token used to read Issues/PRs and post comments. |
| `openai-api-key` | yes | | OpenAI API key used to generate Decision Briefs. |
| `config-path` | no | `.maintainer-kit.yml` | Path to repository context config. |
| `mode` | no | `suggest` | Supported values: `suggest`, `dry-run`. |
| `comment-mode` | no | `update` | Supported values: `create`, `update`, `none`. |
| `model` | no | config value | Model override. If omitted and config is empty, `gpt-4.1-mini` is used. |

## Behavior

- `issues.opened` and `issues.edited` produce an Issue Intake Brief.
- `pull_request.opened`, `pull_request.synchronize`, and `pull_request.reopened` produce a PR
  Decision Brief.
- Unsupported events exit successfully.
- `comment-mode: update` updates the previous `maintainer-kit` bot comment when present.
- `mode: dry-run` prints the rendered brief to logs and does not post a comment.
- The action redacts common secrets, filters generated/binary files, and truncates large diffs
  before sending context to the model.

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

This is a TypeScript action. Release tags should include the generated `dist/index.js` produced by
`pnpm build`.
