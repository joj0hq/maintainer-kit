import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import {
  RELEASE_STATE_MARKER,
  highestReleaseBump,
  incrementVersion,
  parseReleaseState,
  renderReleasePullRequestBody,
  resolveReleaseBump,
  updateChangelog
} from "./release-utils.mjs";

const execFileAsync = promisify(execFile);
const releaseBranch = "release/next";
const pendingLabel = "autorelease: pending";

async function main() {
  const token = process.env.RELEASE_TOKEN || process.env.GH_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const eventPath = process.env.GITHUB_EVENT_PATH;

  if (!token) {
    throw new Error(
      "Set RELEASE_TOKEN to a fine-grained PAT or GitHub App token with Contents, Issues, and Pull requests write access."
    );
  }
  if (!repository || !eventPath) {
    throw new Error("GITHUB_REPOSITORY and GITHUB_EVENT_PATH are required.");
  }

  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY: ${repository}`);
  }

  const event = JSON.parse(await readFile(eventPath, "utf8"));
  const pullRequestNumber = resolvePullRequestNumber(event);
  const mergedPullRequest = await githubApi({
    token,
    path: `/repos/${owner}/${repo}/pulls/${pullRequestNumber}`
  });

  if (!mergedPullRequest.merged_at) {
    throw new Error(`Pull request #${pullRequestNumber} is not merged.`);
  }

  if (mergedPullRequest.head?.ref === releaseBranch) {
    console.log("Merged pull request is the rolling Release PR. Nothing to prepare.");
    return;
  }

  const mergedBump = resolveReleaseBump(labelNames(mergedPullRequest));
  if (mergedBump === "none") {
    console.log(`Pull request #${pullRequestNumber} is release:none. No Release PR update needed.`);
    return;
  }

  const defaultBranch = mergedPullRequest.base?.ref || "main";
  const existingReleasePullRequest = await findOpenReleasePullRequest({
    token,
    owner,
    repo,
    defaultBranch
  });
  if (
    existingReleasePullRequest &&
    !existingReleasePullRequest.body?.includes(RELEASE_STATE_MARKER)
  ) {
    throw new Error(
      `Open Release PR #${existingReleasePullRequest.number} is missing automation metadata.`
    );
  }
  const state = parseReleaseState(existingReleasePullRequest?.body || "");
  const includedNumbers = [...new Set([...state.pullRequests, pullRequestNumber])].sort(
    (a, b) => a - b
  );
  const includedPullRequests = [];

  for (const number of includedNumbers) {
    const pullRequest =
      number === pullRequestNumber
        ? mergedPullRequest
        : await githubApi({
            token,
            path: `/repos/${owner}/${repo}/pulls/${number}`
          });
    if (!pullRequest.merged_at) {
      continue;
    }

    const bump = resolveReleaseBump(labelNames(pullRequest));
    if (bump === "none") {
      continue;
    }

    includedPullRequests.push({
      number: pullRequest.number,
      title: pullRequest.title,
      url: pullRequest.html_url,
      bump
    });
  }

  const bump = highestReleaseBump(includedPullRequests.map((pullRequest) => pullRequest.bump));
  const baseVersion = JSON.parse(await readFile("package.json", "utf8")).version;
  const version = incrementVersion(baseVersion, bump);
  const date = new Date().toISOString().slice(0, 10);

  const remoteBranchSha = await getRemoteBranchSha(releaseBranch);
  await runGit(["fetch", "origin", defaultBranch]);
  await runGit(["checkout", "-B", releaseBranch, `origin/${defaultBranch}`]);

  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  packageJson.version = version;
  await writeFile("package.json", `${JSON.stringify(packageJson, null, 2)}\n`);

  const changelog = await readFile("CHANGELOG.md", "utf8");
  await writeFile(
    "CHANGELOG.md",
    updateChangelog({
      source: changelog,
      version,
      date,
      pullRequests: includedPullRequests
    })
  );

  await runGit(["config", "user.name", "github-actions[bot]"]);
  await runGit(["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);
  await runGit(["add", "--", "package.json", "CHANGELOG.md"]);
  await runGit(["diff", "--cached", "--check"]);
  await runGit(["commit", "-m", `chore: prepare v${version}`]);
  if (remoteBranchSha) {
    await runGit([
      "push",
      `--force-with-lease=refs/heads/${releaseBranch}:${remoteBranchSha}`,
      "origin",
      `HEAD:refs/heads/${releaseBranch}`
    ]);
  } else {
    await runGit(["push", "origin", `HEAD:refs/heads/${releaseBranch}`]);
  }

  const body = renderReleasePullRequestBody({
    version,
    bump,
    pullRequests: includedPullRequests
  });
  const title = `chore: release v${version}`;
  const releasePullRequest = existingReleasePullRequest
    ? await githubApi({
        token,
        method: "PATCH",
        path: `/repos/${owner}/${repo}/pulls/${existingReleasePullRequest.number}`,
        body: { title, body }
      })
    : await githubApi({
        token,
        method: "POST",
        path: `/repos/${owner}/${repo}/pulls`,
        body: {
          title,
          body,
          head: releaseBranch,
          base: defaultBranch,
          draft: true,
          maintainer_can_modify: true
        }
      });

  await githubApi({
    token,
    method: "PUT",
    path: `/repos/${owner}/${repo}/issues/${releasePullRequest.number}/labels`,
    body: {
      labels: [pendingLabel, `release:${bump}`]
    }
  });

  console.log(
    `${existingReleasePullRequest ? "Updated" : "Created"} Release PR #${
      releasePullRequest.number
    } for v${version}: ${releasePullRequest.html_url}`
  );
}

async function getRemoteBranchSha(branch) {
  const result = await runGit(["ls-remote", "--heads", "origin", `refs/heads/${branch}`]);
  const line = result.stdout.trim();
  return line ? line.split(/\s+/)[0] : undefined;
}

function resolvePullRequestNumber(event) {
  const value = event.pull_request?.number ?? event.inputs?.pull_request_number;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(
      "A merged pull request number is required from pull_request.closed or workflow_dispatch."
    );
  }
  return number;
}

async function findOpenReleasePullRequest({ token, owner, repo, defaultBranch }) {
  const query = new URLSearchParams({
    state: "open",
    head: `${owner}:${releaseBranch}`,
    base: defaultBranch,
    per_page: "10"
  });
  const pullRequests = await githubApi({
    token,
    path: `/repos/${owner}/${repo}/pulls?${query}`
  });

  if (pullRequests.length > 1) {
    throw new Error(`Multiple open Release PRs found for ${releaseBranch}.`);
  }
  return pullRequests[0];
}

function labelNames(pullRequest) {
  return (pullRequest.labels || []).map((label) =>
    typeof label === "string" ? label : label.name
  );
}

async function githubApi({ token, path, method = "GET", body }) {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "maintainer-kit-release-automation"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`GitHub API ${method} ${path} failed with ${response.status}: ${responseBody}`);
  }

  return response.status === 204 ? undefined : response.json();
}

async function runGit(args) {
  try {
    return await execFileAsync("git", args, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 10
    });
  } catch (error) {
    throw new Error(`git ${args.join(" ")} failed: ${error.stderr || error.message}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
