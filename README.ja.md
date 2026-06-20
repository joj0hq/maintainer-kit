# maintainer-kit

言語: [English](README.md) | 日本語

`maintainer-kit` は、GitHub Issue と Pull Request をメンテナーやプロダクトチーム向けの実用的な Decision Brief に変換し、maintainer が承認した Issue から小さな draft の再現 PR も作れる GitHub Action です。

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
- [再現 draft PR](#再現-draft-pr)
- [入力](#入力)
- [挙動](#挙動)
- [Privacy と安全性](#privacy-と安全性)
- [ヘルプ](#ヘルプ)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)
- [Release](#release)
- [開発](#開発)

## 状態

`maintainer-kit` は public repository として公開されており、MIT License で利用できます。
GitHub Actions からは `v0` tag で利用できます。

このリポジトリには、GitHub Action runtime に必要な生成済みの `dist/index.js` bundle も含まれています。

現在は 0.x release line です。1.0 release までの間に、prompt、config、output の細部は変わる可能性があります。

## 機能

- `issues.opened` / `issues.edited` 向けの Issue Intake Brief
- `pull_request.opened` / `pull_request.synchronize` / `pull_request.reopened` 向けの PR Decision Brief
- maintainer が承認した Issue からの再現 draft PR 作成
- `.maintainer-kit.yml` によるリポジトリ文脈設定
- structured model output からの安定した Markdown rendering
- 英語 / 日本語の brief comment 出力
- コメントの create / update / skip
- workflow を安全に試すための dry-run mode
- 明示的に有効化された agent task 向けの guardrail 付き branch / commit / push / draft PR 作成
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
- maintainer の承認なしに自動修正、自動 merge、自動 label、自動 close をする

## 出力例

Issue では Issue Intake Brief を投稿します。

```md
## Maintainer Kit Issue 整理ブリーフ

これはAI生成のIssue整理ブリーフです。対応前に内容を確認してください。

### Issue 種別

バグ

### 要約

ログイン失敗が報告されていますが、再現手順や環境情報が不足しています。

### 対応可能性

低

### 不足している文脈

- 再現手順
- 期待される挙動
- 実際の挙動
- バージョンと環境

### 推奨される次のアクション

調査に入る前に、報告者へ再現情報の共有を依頼します。
```

Pull Request では PR Decision Brief を投稿します。

```md
## Maintainer Kit 判断ブリーフ

これはAI生成の判断ブリーフです。対応前に内容を確認してください。

### 要約

このPRは、workspace admin 向けのレポートエクスポート挙動を変更します。

### 必要な判断

新しい挙動をすべての workspace に適用するのか、advanced reporting が有効な workspace に限定するのか確認が必要です。

### 影響範囲

**ユーザーフロー**

- レポートエクスポート
- 管理者設定

**プロダクト / リポジトリ領域**

- レポートダッシュボード
- Export API

### QA チェックリスト

- [ ] Admin がデフォルトfilterでレポートをエクスポートできる。
- [ ] Admin がカスタムfilterでレポートをエクスポートできる。
- [ ] permission denied の状態が適切に処理される。
```

モデルは structured JSON を返し、最終的な Markdown は `maintainer-kit` 側でレンダリングします。そのため、コメント形式は安定します。

## 必要なもの

- GitHub Actions
- workflow permissions: `contents: read`, `issues: write`, `pull-requests: write`
- `issue_reproduction_pr` を有効にする場合は `contents: write`
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
      - uses: actions/checkout@v7
      - uses: joj0hq/maintainer-kit@v0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          config-path: .maintainer-kit.yml
          mode: suggest
          output-language: ja
```

Repository または Organization の secrets に `OPENAI_API_KEY` を追加してください。

brief comment はデフォルトでは英語です。日本語で投稿したい場合は `output-language: ja`、または
`.maintainer-kit.yml` の `language.output: ja` を設定してください。

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
  issue_reproduction_pr: false
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
  output: ja

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

## 再現 draft PR

`maintainer-kit` は、maintainer が承認した Issue を小さな draft PR に変換することもできます。この機能は
branch、commit、push、pull request を作成するため、デフォルトでは無効です。

明示的に有効化します。

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

次のどちらかで起動します。

- 設定した label、例: `maintainer-kit:repro`
- 信頼できる repository actor (`OWNER`, `MEMBER`, `COLLABORATOR`) が投稿した設定済み comment command、例:
  `/maintainer-kit repro`

生成される PR は常に draft です。MVP では完全な修正ではなく、まず再現ケースまたは failing regression case を残すことを狙います。設定された allowed paths の外、blocked paths、既存ファイル、サイズ上限を超えるファイル、secret らしき内容は拒否します。

workflow events:

```yaml
on:
  issues:
    types: [opened, edited, labeled]
  issue_comment:
    types: [created]
```

推奨 workflow permissions:

```yaml
permissions:
  contents: write
  issues: write
  pull-requests: write
```

## 入力

| 入力              | 必須 | デフォルト            | 説明                                                                       |
| ----------------- | ---- | --------------------- | -------------------------------------------------------------------------- |
| `github-token`    | yes  |                       | Issue / PR の読み取りとコメント投稿に使うトークン。                        |
| `openai-api-key`  | yes  |                       | brief と再現 PR content の生成に使う OpenAI API キー。                     |
| `config-path`     | no   | `.maintainer-kit.yml` | リポジトリ文脈設定ファイルへのパス。                                       |
| `mode`            | no   | `suggest`             | 対応値: `suggest`, `dry-run`。                                             |
| `comment-mode`    | no   | `update`              | 対応値: `create`, `update`, `none`。                                       |
| `model`           | no   | 設定ファイルの値      | モデル名の上書き。未指定かつ設定が空の場合は `gpt-4.1-mini` が使われます。 |
| `output-language` | no   | 設定ファイルの値      | Brief comment の出力言語。対応値: `en`, `ja`。                             |

## 挙動

| Event                      | Result                                                                                                                            |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `issues.opened`            | Issue Intake Brief を作成または更新します。                                                                                       |
| `issues.edited`            | Issue Intake Brief を作成または更新します。                                                                                       |
| `issues.labeled`           | `issue_reproduction_pr` が有効で、設定された trigger label が付いた場合に再現 draft PR を作成します。                             |
| `issue_comment.created`    | `issue_reproduction_pr` が有効で、信頼できる maintainer が設定された trigger command を投稿した場合に再現 draft PR を作成します。 |
| `pull_request.opened`      | PR Decision Brief を作成または更新します。                                                                                        |
| `pull_request.synchronize` | 最新の変更ファイルをもとに PR Decision Brief を作成または更新します。                                                             |
| `pull_request.reopened`    | PR Decision Brief を作成または更新します。                                                                                        |
| 未対応イベント             | コメントせず正常終了します。                                                                                                      |

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

デフォルトでは、この Action は次を行いません。

- commit を push する
- branch を作成する
- PR を merge する
- Issue を close する
- デフォルトで label を付ける
- 人間のコメントを削除する
- GitHub Actions runtime 外に private data を保存する

`features.issue_reproduction_pr` を明示的に有効化し、信頼できる trigger が使われた場合、この Action は branch
作成、生成された再現ファイルの commit、branch push、draft PR 作成を行えます。それでも PR の merge、Issue の
close、設定された allowed paths 外の編集は行いません。

## プロジェクトの状態

このリポジトリには、Action runtime 用の TypeScript source、tests、生成済みの `dist/index.js`
bundle が含まれています。CI では、source 変更後に committed bundle が最新かどうかも確認します。

## ヘルプ

GitHub Issue を開く場合は、次の情報があると調査しやすいです。

- event type (`issues.opened`, `pull_request.synchronize` など)
- workflow snippet
- secret を除いた `.maintainer-kit.yml`
- 可能であれば Action logs

API key、token、private repository content、sensitive な full diff は Issue に含めないでください。

## Contributing

このプロジェクトはまだ小さく、方向性も固めている途中なので、contribution は歓迎です。

詳しくは [CONTRIBUTING.md](CONTRIBUTING.md) を見てください。

`main` branch は、CI 必須かつ 1 approval 必須の protected branch として運用する想定です。maintainer は
[`scripts/apply-main-branch-protection.sh`](scripts/apply-main-branch-protection.sh) で想定設定を適用できます。

## Security

security-sensitive な内容は public Issue に書かないでください。詳しくは [SECURITY.md](SECURITY.md) を見てください。

## License

MIT License です。詳細は [LICENSE](LICENSE) を見てください。

## Release

release tag は GitHub Actions の `Release` workflow から公開します。

GitHub Release には `v0.1.0` のような full version tag を使います。`v0` major tag は、user workflow
向けの moving compatibility tag として更新します。

`Release` workflow は次の2通りで release を公開できます。

- `v0.1.0` のような full version を指定して手動実行する
- `v0.1.0` のような full version tag を push する

どちらの場合も、workflow が check を実行し、GitHub Release を作成し、stable release では `v0` major tag
を更新します。

公開前に maintainer は次を確認します。

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm bundle
git diff --exit-code dist
```

詳しい checklist は [RELEASING.md](RELEASING.md) を見てください。

## 開発

必要なもの:

- local development 用の Node.js 20+
- pnpm

公開される GitHub Action は [`action.yml`](action.yml) で宣言している GitHub Actions の `node20`
runtime で動きます。リポジトリの CI / release workflow では `actions/setup-node@v6` を使って
Node.js 20 をインストールし、各種チェックを実行します。

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
