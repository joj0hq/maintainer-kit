# maintainer-kit

言語: [English](README.md) | 日本語

`maintainer-kit` は、GitHub Issue と Pull Request をメンテナーやプロダクトチーム向けの実用的な Decision Brief に変換する GitHub Action です。

これは AI コードレビューではありません。Issue や PR を前に進める前に、チームが何を理解し、確認し、質問し、判断すべきかに焦点を当てます。

## 使い方

`.github/workflows/maintainer-kit.yml` を作成します。

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

## 設定

設定ファイルは任意です。`.maintainer-kit.yml` が存在しない場合は、OSS 向けの安全なデフォルト設定が使われます。

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

## 入力

| 入力 | 必須 | デフォルト | 説明 |
| --- | --- | --- | --- |
| `github-token` | yes | | Issue/PR の読み取りとコメント投稿に使うトークン。 |
| `openai-api-key` | yes | | Decision Brief の生成に使う OpenAI API キー。 |
| `config-path` | no | `.maintainer-kit.yml` | リポジトリの文脈設定ファイルへのパス。 |
| `mode` | no | `suggest` | 対応値: `suggest`, `dry-run`。 |
| `comment-mode` | no | `update` | 対応値: `create`, `update`, `none`。 |
| `model` | no | 設定ファイルの値 | モデル名の上書き。未指定かつ設定が空の場合は `gpt-4.1-mini` が使われます。 |

## 挙動

- `issues.opened` と `issues.edited` は Issue Intake Brief を生成します。
- `pull_request.opened`, `pull_request.synchronize`, `pull_request.reopened` は PR Decision Brief を生成します。
- 対応していないイベントでは、エラーにせず正常終了します。
- `comment-mode: update` の場合、既存の `maintainer-kit` bot コメントがあれば更新します。
- `mode: dry-run` の場合、生成された brief をログに出力し、GitHub コメントは投稿しません。
- モデルに文脈を送る前に、一般的なシークレットの redaction、生成物/バイナリファイルの除外、大きな diff の切り詰めを行います。

## 開発

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

これは TypeScript 製の GitHub Action です。リリースタグには、`pnpm build` で生成される `dist/index.js` を含めてください。
