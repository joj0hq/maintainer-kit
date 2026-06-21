# Releasing maintainer-kit

This repository uses a rolling Release PR. Maintainers do not type the next version manually.

Each normal pull request must have exactly one release label:

- `release:patch`: backward-compatible fixes, documentation, and maintenance
- `release:minor`: backward-compatible features
- `release:major`: breaking releases or an explicit 1.0 release
- `release:none`: no versioned release is required

The highest label among the pull requests in the open Release PR determines the next version.

For the current 0.x release line:

- patch from `0.1.0` becomes `0.1.1`
- minor from `0.1.0` becomes `0.2.0`
- major from `0.1.0` becomes `1.0.0`

Use `release:major` deliberately while the project is below 1.0.

## Setup

1. Create the release labels by running the `Setup Release Labels` workflow.
2. Create a fine-grained personal access token or GitHub App token with:
   - Contents: read and write
   - Issues: read and write
   - Pull requests: read and write
3. Save it as the repository Actions secret `RELEASE_TOKEN`.
4. Apply the expected branch protection:

```bash
GITHUB_TOKEN=... scripts/apply-main-branch-protection.sh
```

The separate token is required because pull requests created with the default `GITHUB_TOKEN` do
not trigger normal GitHub Actions workflows. The rolling Release PR needs its regular CI and
required checks.

## Normal Flow

1. Add exactly one `release:*` label to each normal pull request.
2. Merge the pull request after `test`, `release-label`, and review requirements pass.
3. The `Prepare Release` workflow creates or updates `release/next`.
4. The rolling Release PR updates:
   - `package.json`
   - `CHANGELOG.md`
   - the target version and included pull request list
5. Leave the Release PR open while collecting more changes.
6. Mark it ready and merge it when you want to publish.
7. The `Release` workflow validates the repository and publishes:
   - immutable full tag, such as `v0.2.0`
   - GitHub Release
   - moving major tag, such as `v0`
   - moving minor tag, such as `v0.2`

Do not create a separate release branch for every merged pull request. `release/next` is the single
rolling branch and is regenerated from the latest `main` each time.

## Release PR Rules

- The Release PR is created as a draft.
- Do not edit the `release/next` branch manually; automation regenerates it.
- New merged pull requests update the existing Release PR and may change its target version.
- New commits dismiss stale approval according to branch protection.
- Closing an unmerged Release PR discards its stored pull request list. Prefer leaving it open or
  reopening it.

## Recovery

If `Prepare Release` failed for an already merged pull request, manually run the workflow and enter
that pull request number. No version input is required.

If publishing fails after the Release PR is merged, manually rerun the `Release` workflow. It reads
the version from `package.json` and safely skips a GitHub Release that already exists.

## Generated Bundle

`dist/index.js` must be committed by normal runtime-changing pull requests before they merge.
The rolling Release PR only changes release metadata. The `Release` workflow runs `pnpm bundle`
and fails if the committed bundle is not already up to date.

## Tags

- `v0.2.0`, `v0.2.1`, etc. are immutable release tags.
- `v0` is a moving major compatibility tag for GitHub Action consumers.
- `v0.2` is a moving minor compatibility tag.

Never rewrite immutable full version tags. Publish a new patch release to fix a bad release.
