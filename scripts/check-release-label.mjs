import { readFile } from "node:fs/promises";
import { RELEASE_LABELS, resolveReleaseBump } from "./release-utils.mjs";

async function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    throw new Error("GITHUB_EVENT_PATH is required.");
  }

  const event = JSON.parse(await readFile(eventPath, "utf8"));
  const pullRequest = event.pull_request;
  if (!pullRequest) {
    throw new Error("pull_request payload is required.");
  }

  if (pullRequest.head?.ref === "release/next") {
    console.log("Rolling Release PR is exempt from the release label requirement.");
    return;
  }

  const labels = (pullRequest.labels || []).map((label) => label.name);
  let bump;
  try {
    bump = resolveReleaseBump(labels);
  } catch (error) {
    if (await isReleaseLabelBootstrap()) {
      console.log(
        "Release labels are not configured yet. Skipping enforcement until Setup Release Labels runs."
      );
      return;
    }
    throw error;
  }

  console.log(`Release label is valid: release:${bump}`);
  console.log(`Available release labels: ${RELEASE_LABELS.join(", ")}`);
}

async function isReleaseLabelBootstrap() {
  const token = process.env.GH_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!token || !repository) {
    return false;
  }

  const response = await fetch(`https://api.github.com/repos/${repository}/labels?per_page=100`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "maintainer-kit-release-label-check"
    }
  });
  if (!response.ok) {
    throw new Error(`Could not inspect repository labels: HTTP ${response.status}`);
  }

  const repositoryLabels = (await response.json()).map((label) => label.name);
  const configuredReleaseLabels = RELEASE_LABELS.filter((label) =>
    repositoryLabels.includes(label)
  );

  if (configuredReleaseLabels.length === 0) {
    return true;
  }
  if (configuredReleaseLabels.length !== RELEASE_LABELS.length) {
    throw new Error(
      `Release labels are only partially configured: ${configuredReleaseLabels.join(", ")}`
    );
  }

  return false;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
