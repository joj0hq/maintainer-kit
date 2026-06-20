# Releasing maintainer-kit

This repository publishes GitHub Action releases with immutable version tags and a moving major tag.

Use full version tags, such as `v0.1.0`, for changelog entries and GitHub Releases. Use the major
tag, such as `v0`, in user-facing workflow examples when the next compatible release should be
picked up automatically.

The preferred release path is the `Release` workflow. It creates the immutable full version tag,
creates the GitHub Release, and moves the compatible major tag for stable releases. As a fallback,
pushing a full version tag such as `v0.1.0` also runs the same validation, creates the GitHub
Release, and moves the major tag when the release is stable.

## Release Checklist

1. Choose the next version.
   - Patch: bug fixes and documentation-only release updates.
   - Minor: new compatible behavior or inputs.
   - Major: breaking behavior, input, output, permission, or runtime changes.
2. Update `package.json` version without the leading `v`.
3. Update `CHANGELOG.md`.
4. Build and verify locally:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm bundle
git diff --exit-code dist
```

5. Commit the release preparation changes.
6. Run the `Release` workflow from GitHub Actions.
   - `version`: full tag, for example `v0.1.0`
   - `prerelease`: true only for preview releases
   - `update_major_tag`: true for stable releases
7. Verify the created GitHub Release and the major tag.

Alternative tag-push flow:

1. Complete steps 1-5 above.
2. Push a full version tag, for example `v0.1.0`.
3. The `Release` workflow will validate the repository, create the GitHub Release, and move `v0`
   for stable releases.

## Tags

- `v0.1.0`, `v0.1.1`, etc. are immutable release tags.
- `v0` is a moving compatibility tag for GitHub Action consumers.

Do not rewrite immutable release tags after publishing. If a release is bad, publish a new patch
release and move the major tag to the fixed version.

Do not create GitHub Releases manually from the GitHub UI unless the workflow is unavailable. The
workflow is the source of truth because it verifies tests and the committed `dist/index.js` bundle
before publishing.

## Generated Bundle

`dist/index.js` must be committed before a release. GitHub Actions runs JavaScript actions from the
repository contents at the selected ref, so users cannot install dependencies at runtime.

The `Release` workflow runs `pnpm bundle` and fails if `dist/index.js` is not already up to date.
