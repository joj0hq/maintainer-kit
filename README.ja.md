# maintainer-kit

言語: [English](README.md) | 日本語

`maintainer-kit` は、GitHub Issue と Pull Request を、メンテナーやプロダクトチーム向けの実用的な Decision Brief に変換する GitHub Action です。

メンテナンス作業で詰まりがちな次の問いに、人間が答えやすくします。

- この Issue / PR は結局何についてのものか
- 前に進める前に何を判断する必要があるか
- どんな文脈が足りないか
- どのプロダクト領域・リポジトリ領域に影響しそうか
- 誰がレビューすべきか
- どんな QA / release 確認が必要そうか
- メンテナーは次にどんな返信を送るとよいか

## 目次

- [状態](#状態)
- [機能](#機能)
- [使いどころ](#使いどころ)
- [出力例](#出力例)
- [必要なもの](#必要なもの)
- [クイックスタート](#クイックスタート)
- [リポジトリ文脈の設定](#リポジトリ文脈の設定)
- [入力](#入力)
- [挙動](#挙動)
- [Privacy と安全性](#privacy-と安全性)
- [ヘルプ](#ヘルプ)
- [Contributing](#contributing)
- [License](#license)
- [開発](#開発)

## 状態

このプロジェクトは early MVP development の段階です。

source code は public ですが、GitHub Action として本番利用できる release にはまだ次が必要です。

- Action runtime 用に生成された `dist/index.js` の commit
- `v0` などの release tag
- 明示的な open source license
- contribution / security policy ファイル

以下の workflow 例は、最初の release を公開したあとの想定利用方法です。

## 機能

- `issues.opened` / `issues.edited` 向けの Issue Intake Brief
- `pull_request.opened` / `pull_request.synchronize` / `pull_request.reopened` 向けの PR Decision Brief
- `.maintainer-kit.yml` によるリポジトリ文脈設定
- structured model output からの安定した Markdown rendering
- コメントの create / update / skip
- workflow を安全に試すための dry-run mode
- model call 前の secret redaction、file filtering、diff truncation
- デフォルトでは repository を変更しない non-mutating behavior

## 使いどころ

Issue や PR が技術的には読めるものの、判断に必要な文脈が足りないときに `maintainer-kit` が役立ちます。

向いているケース:

- OSS プロジェクトで、初回 triage コメントの品質を揃えたい
- merge 前に PM、QA、design、backend、release owner などの観点を整理したい
- contributor にやさしい返信 draft が欲しい
- docs、public API、billing、auth、CLI 挙動、生成ファイル、release note、互換性に影響する PR が多い

向いていないケース:

- 人間のメンテナーを置き換える
- security scanner として使う
- 自動修正、自動 merge、自動 label、自動 close をする

## 出力例

Issue では Issue Intake Brief を投稿します。

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

Pull Request では PR Decision Brief を投稿します。

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

モデルは structured JSON を返し、最終的な Markdown は `maintainer-kit` 側でレンダリングします。そのため、コメント形式は安定します。

## 必要なもの

- GitHub Actions
- workflow permissions: `contents: read`, `issues: write`, `pull-requests: write`
- `OPENAI_API_KEY` として保存された OpenAI API key
- `dist/index.js` を含む公開済みの `maintainer-kit` release tag

## クイックスタート

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
      - uses: joj0hq/maintainer-kit@v0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          config-path: .maintainer-kit.yml
          mode: suggest
```

Repository または Organization の secrets に `OPENAI_API_KEY` を追加してください。

## リポジトリ文脈の設定

設定ファイルは任意です。`.maintainer-kit.yml` が存在しない場合は、OSS 向けの安全なデフォルト設定が使われます。

リポジトリ領域、重要なフロー、メトリクス、レビューロールなどを brief に反映したい場合は、設定ファイルを追加します。

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

より詳しい例は [.maintainer-kit.example.yml](.maintainer-kit.example.yml) を見てください。

## 入力

| 入力 | 必須 | デフォルト | 説明 |
| --- | --- | --- | --- |
| `github-token` | yes | | Issue / PR の読み取りとコメント投稿に使うトークン。 |
| `openai-api-key` | yes | | Decision Brief の生成に使う OpenAI API キー。 |
| `config-path` | no | `.maintainer-kit.yml` | リポジトリ文脈設定ファイルへのパス。 |
| `mode` | no | `suggest` | 対応値: `suggest`, `dry-run`。 |
| `comment-mode` | no | `update` | 対応値: `create`, `update`, `none`。 |
| `model` | no | 設定ファイルの値 | モデル名の上書き。未指定かつ設定が空の場合は `gpt-4.1-mini` が使われます。 |

## 挙動

| Event | Result |
| --- | --- |
| `issues.opened` | Issue Intake Brief を作成または更新します。 |
| `issues.edited` | Issue Intake Brief を作成または更新します。 |
| `pull_request.opened` | PR Decision Brief を作成または更新します。 |
| `pull_request.synchronize` | 最新の変更ファイルをもとに PR Decision Brief を作成または更新します。 |
| `pull_request.reopened` | PR Decision Brief を作成または更新します。 |
| 未対応イベント | コメントせず正常終了します。 |

コメントモード:

- `update`: 既存の `maintainer-kit` bot コメントがあれば更新し、なければ作成します。
- `create`: 常に新しいコメントを作成します。
- `none`: コメントを投稿しません。

実行モード:

- `suggest`: brief を生成し、`comment-mode` に従って投稿します。
- `dry-run`: brief を生成してログに出力し、GitHub コメントは投稿しません。

## Privacy と安全性

モデルに文脈を送る前に、`maintainer-kit` は次の処理を行います。

- 生成物、バイナリ、lockfile、画像、archive、設定で除外されたファイルを除外
- 大きな diff を行数・文字数の上限で切り詰め
- GitHub token、OpenAI API key、bearer token、private key、database URL、環境変数代入、高エントロピー文字列などの一般的な secret を redaction
- 非機密の実行メタデータのみをログ出力

この Action が行わないこと:

- commit を push する
- branch を作成する
- PR を merge する
- Issue を close する
- デフォルトで label を付ける
- 人間のコメントを削除する
- GitHub Actions runtime 外に private data を保存する

## プロジェクトの状態

このリポジトリには、MVP Action の TypeScript source が含まれています。実際に GitHub Action として使う release tag には、`pnpm build` で生成される `dist/index.js` を含めてください。

## ヘルプ

GitHub Issue を開く場合は、次の情報があると調査しやすいです。

- event type (`issues.opened`, `pull_request.synchronize` など)
- workflow snippet
- secret を除いた `.maintainer-kit.yml`
- 可能であれば Action logs

API key、token、private repository content、sensitive な full diff は Issue に含めないでください。

## Contributing

このプロジェクトはまだ小さく、方向性も固めている途中なので、contribution は歓迎です。

専用の `CONTRIBUTING.md` ができるまでは、次を目安にしてください。

- 大きな behavior / API 変更の前には Issue を開く
- PR は小さく focused にする
- submit 前に `pnpm typecheck` と `pnpm test` を実行する
- config、privacy、rendering、GitHub comment behavior を変更する場合は test を追加する

## License

まだ open source license は公開されていません。法的に open source として扱う、または外部 contribution を受け入れる前に `LICENSE` file を追加してください。

## 開発

必要なもの:

- Node.js 20+
- pnpm

コマンド:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

主なファイル:

- [action.yml](action.yml): GitHub Action の metadata と inputs
- [src/index.ts](src/index.ts): Action entrypoint
- [src/config/defaultConfig.ts](src/config/defaultConfig.ts): 安全なデフォルト設定
- [src/privacy](src/privacy): ファイル除外、redaction、diff truncation
- [src/render](src/render): 安定した Markdown rendering
- [tests](tests): config、privacy、truncation、rendering の単体テスト
