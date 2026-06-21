export const RELEASE_LABEL_PREFIX = "release:";
export const RELEASE_LABELS = ["release:patch", "release:minor", "release:major", "release:none"];

export const RELEASE_STATE_MARKER = "maintainer-kit:release-state";

const bumpOrder = {
  none: 0,
  patch: 1,
  minor: 2,
  major: 3
};

export function resolveReleaseBump(labels) {
  const matchingLabels = labels.filter((label) => RELEASE_LABELS.includes(label));

  if (matchingLabels.length !== 1) {
    throw new Error(
      `Expected exactly one release label (${RELEASE_LABELS.join(", ")}), found: ${
        matchingLabels.join(", ") || "none"
      }`
    );
  }

  return matchingLabels[0].slice(RELEASE_LABEL_PREFIX.length);
}

export function highestReleaseBump(bumps) {
  return bumps.reduce((highest, bump) => {
    assertReleaseBump(bump);
    return bumpOrder[bump] > bumpOrder[highest] ? bump : highest;
  }, "none");
}

export function incrementVersion(version, bump) {
  assertReleaseBump(bump);

  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Invalid semantic version: ${version}`);
  }

  let major = Number(match[1]);
  let minor = Number(match[2]);
  let patch = Number(match[3]);

  if (bump === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bump === "minor") {
    minor += 1;
    patch = 0;
  } else if (bump === "patch") {
    patch += 1;
  } else {
    throw new Error("release:none does not produce a release version.");
  }

  return `${major}.${minor}.${patch}`;
}

export function parseReleaseState(body) {
  const pattern = new RegExp(
    `<!--\\s*${escapeRegExp(RELEASE_STATE_MARKER)}\\s+([\\s\\S]*?)\\s*-->`
  );
  const match = pattern.exec(body || "");
  if (!match) {
    return { pullRequests: [] };
  }

  const parsed = JSON.parse(match[1]);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray(parsed.pullRequests) ||
    parsed.pullRequests.some((value) => !Number.isInteger(value) || value <= 0)
  ) {
    throw new Error("Release PR metadata is invalid.");
  }

  return {
    pullRequests: [...new Set(parsed.pullRequests)].sort((a, b) => a - b)
  };
}

export function renderReleasePullRequestBody({ version, bump, pullRequests }) {
  const state = JSON.stringify({
    pullRequests: pullRequests.map((pullRequest) => pullRequest.number)
  });

  const changes = pullRequests
    .map((pullRequest) => `- #${pullRequest.number} ${pullRequest.title} (\`${pullRequest.bump}\`)`)
    .join("\n");

  return `<!-- ${RELEASE_STATE_MARKER} ${state} -->
## Release v${version}

This rolling Release PR is maintained automatically. Merge it when you want to publish the release.

### Version

- Current bump: \`${bump}\`
- Target version: \`v${version}\`

### Included Pull Requests

${changes || "- No releasable pull requests found."}

### On Merge

- Validate typecheck, tests, lint, and the committed \`dist/index.js\` bundle.
- Create the immutable \`v${version}\` tag and GitHub Release.
- Move the compatible major and minor tags.
`;
}

export function updateChangelog({ source, version, date, pullRequests }) {
  const unreleasedHeading = "## Unreleased";
  const headingIndex = source.indexOf(unreleasedHeading);
  if (headingIndex === -1) {
    throw new Error("CHANGELOG.md must contain an ## Unreleased section.");
  }

  const contentStart = headingIndex + unreleasedHeading.length;
  const nextHeadingMatch = /\n##\s/.exec(source.slice(contentStart));
  const nextHeadingIndex = nextHeadingMatch
    ? contentStart + nextHeadingMatch.index + 1
    : source.length;

  const unreleasedContent = source.slice(contentStart, nextHeadingIndex).trim();
  const existingEntries =
    unreleasedContent && unreleasedContent !== "No unreleased changes." ? unreleasedContent : "";

  const generatedEntries = pullRequests
    .filter((pullRequest) => !existingEntries.includes(`#${pullRequest.number}`))
    .map((pullRequest) => `- #${pullRequest.number} ${pullRequest.title}`)
    .join("\n");

  const releaseEntries = [existingEntries, generatedEntries].filter(Boolean).join("\n");
  const suffix = source.slice(nextHeadingIndex).trimStart();

  return `${source.slice(0, headingIndex)}${unreleasedHeading}

No unreleased changes.

## ${version} - ${date}

${releaseEntries || "- No user-facing changes."}

${suffix}`;
}

function assertReleaseBump(bump) {
  if (!(bump in bumpOrder)) {
    throw new Error(`Invalid release bump: ${bump}`);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
