import assert from "node:assert/strict";
import test from "node:test";
import {
  highestReleaseBump,
  incrementVersion,
  parseReleaseState,
  renderReleasePullRequestBody,
  resolveReleaseBump,
  updateChangelog
} from "../scripts/release-utils.mjs";

test("resolveReleaseBump requires exactly one release label", () => {
  assert.equal(resolveReleaseBump(["bug", "release:patch"]), "patch");
  assert.throws(() => resolveReleaseBump(["bug"]), /found: none/);
  assert.throws(
    () => resolveReleaseBump(["release:patch", "release:minor"]),
    /Expected exactly one release label/
  );
});

test("highestReleaseBump selects the largest increment", () => {
  assert.equal(highestReleaseBump(["patch", "minor", "patch"]), "minor");
  assert.equal(highestReleaseBump(["minor", "major"]), "major");
});

test("incrementVersion follows semantic versioning", () => {
  assert.equal(incrementVersion("0.1.0", "patch"), "0.1.1");
  assert.equal(incrementVersion("0.1.0", "minor"), "0.2.0");
  assert.equal(incrementVersion("0.1.0", "major"), "1.0.0");
  assert.throws(() => incrementVersion("0.1.0", "none"), /does not produce/);
});

test("release PR body round-trips its machine-readable state", () => {
  const body = renderReleasePullRequestBody({
    version: "0.2.0",
    bump: "minor",
    pullRequests: [
      { number: 2, title: "Add issue reproduction PRs", bump: "minor" },
      { number: 4, title: "Fix docs", bump: "patch" }
    ]
  });

  assert.deepEqual(parseReleaseState(body), { pullRequests: [2, 4] });
  assert.match(body, /Target version: `v0\.2\.0`/);
});

test("updateChangelog moves Unreleased entries into the target version", () => {
  const source = `# Changelog

## Unreleased

- Existing release note.

## 0.1.0 - 2026-06-20

- Initial release.
`;

  const output = updateChangelog({
    source,
    version: "0.2.0",
    date: "2026-06-21",
    pullRequests: [{ number: 2, title: "Add issue reproduction PRs", bump: "minor" }]
  });

  assert.match(output, /## Unreleased\n\nNo unreleased changes\./);
  assert.match(output, /## 0\.2\.0 - 2026-06-21/);
  assert.match(output, /- Existing release note\./);
  assert.match(output, /- #2 Add issue reproduction PRs/);
  assert.match(output, /## 0\.1\.0 - 2026-06-20/);
});
