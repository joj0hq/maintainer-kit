import type { MaintainerKitConfig } from "../config/schema.js";
import type { RepositoryRef } from "../github/context.js";
import { redactSecrets } from "../privacy/redactSecrets.js";

export interface CiFixPullRequest {
  number: number;
  title: string;
  body: string;
  htmlUrl: string;
  baseRef: string;
  headRef: string;
  headSha: string;
  author: string;
  labels: string[];
}

export interface FailedJobContext {
  id: number;
  name: string;
  conclusion: string;
  htmlUrl: string;
  log: string;
  logWasTruncated: boolean;
}

export interface CiFailureContext {
  pullRequest: CiFixPullRequest;
  run: {
    id: number;
    name: string;
    htmlUrl: string;
    conclusion: string;
    headSha: string;
  };
  failedJobs: FailedJobContext[];
}

const failureConclusions = new Set([
  "failure",
  "timed_out",
  "cancelled",
  "action_required",
  "startup_failure",
  "stale"
]);
const ansiColorPattern = new RegExp(String.raw`\x1B\[[0-9;]*m`, "g");

export async function getCiFailureContext(options: {
  octokit: any;
  githubToken: string;
  repository: RepositoryRef;
  pullRequestNumber: number;
  config: MaintainerKitConfig;
}): Promise<CiFailureContext> {
  const pullResponse = await options.octokit.rest.pulls.get({
    owner: options.repository.owner,
    repo: options.repository.repo,
    pull_number: options.pullRequestNumber
  });
  const pullRequest = pullResponse.data;
  const repositoryFullName = `${options.repository.owner}/${options.repository.repo}`;

  if (pullRequest.state !== "open") {
    throw new Error(`Pull request #${options.pullRequestNumber} is not open.`);
  }
  if (pullRequest.head?.repo?.full_name !== repositoryFullName) {
    throw new Error(
      "CI fix PRs currently support only same-repository pull requests. Fork pull requests are read-only."
    );
  }

  const runsResponse = await options.octokit.rest.actions.listWorkflowRunsForRepo({
    owner: options.repository.owner,
    repo: options.repository.repo,
    event: "pull_request",
    branch: pullRequest.head.ref,
    status: "completed",
    per_page: 50
  });
  const run = selectFailedWorkflowRun(
    runsResponse.data.workflow_runs,
    pullRequest.number,
    pullRequest.head.sha
  );
  if (!run) {
    throw new Error(
      `No completed failed workflow run found for pull request #${pullRequest.number}.`
    );
  }

  const jobsResponse = await options.octokit.rest.actions.listJobsForWorkflowRun({
    owner: options.repository.owner,
    repo: options.repository.repo,
    run_id: run.id,
    filter: "latest",
    per_page: 100
  });
  const failedJobs = jobsResponse.data.jobs
    .filter((job: any) => failureConclusions.has(String(job.conclusion)))
    .slice(0, options.config.agent.ci_fix_pr.max_failed_jobs);

  if (failedJobs.length === 0) {
    throw new Error(`Workflow run ${run.id} has no failed jobs with downloadable logs.`);
  }

  const jobContexts: FailedJobContext[] = [];
  const perJobLogChars = Math.max(
    1,
    Math.floor(options.config.agent.ci_fix_pr.max_log_chars / failedJobs.length)
  );
  for (const job of failedJobs) {
    const rawLog = await downloadJobLog({
      githubToken: options.githubToken,
      repository: options.repository,
      jobId: job.id
    });
    const sanitizedLog = sanitizeCiJobLog(rawLog);
    const truncatedLog = truncateCiLog(sanitizedLog, perJobLogChars);

    jobContexts.push({
      id: job.id,
      name: job.name,
      conclusion: String(job.conclusion),
      htmlUrl: job.html_url,
      log: truncatedLog.value,
      logWasTruncated: truncatedLog.truncated
    });
  }

  return {
    pullRequest: {
      number: pullRequest.number,
      title: pullRequest.title ?? "",
      body: pullRequest.body ?? "",
      htmlUrl: pullRequest.html_url,
      baseRef: pullRequest.base.ref,
      headRef: pullRequest.head.ref,
      headSha: pullRequest.head.sha,
      author: pullRequest.user?.login ?? "unknown",
      labels: (pullRequest.labels ?? []).map((label: any) =>
        typeof label === "string" ? label : label.name
      )
    },
    run: {
      id: run.id,
      name: run.name ?? run.display_title ?? "GitHub Actions",
      htmlUrl: run.html_url,
      conclusion: String(run.conclusion),
      headSha: run.head_sha
    },
    failedJobs: jobContexts
  };
}

export function selectFailedWorkflowRun(
  runs: any[],
  pullRequestNumber: number,
  headSha: string
): any | undefined {
  const matchingRuns = [...runs]
    .filter((run) => {
      const matchesPullRequest = (run.pull_requests ?? []).some(
        (pullRequest: any) => pullRequest.number === pullRequestNumber
      );
      return matchesPullRequest || run.head_sha === headSha;
    })
    .sort((left, right) =>
      String(right.updated_at ?? right.created_at).localeCompare(
        String(left.updated_at ?? left.created_at)
      )
    );
  const latestRunsByWorkflow = new Map<string, any>();

  for (const run of matchingRuns) {
    const workflowKey = String(run.workflow_id ?? run.path ?? run.name ?? "unknown");
    if (!latestRunsByWorkflow.has(workflowKey)) {
      latestRunsByWorkflow.set(workflowKey, run);
    }
  }

  return [...latestRunsByWorkflow.values()].find((run) =>
    failureConclusions.has(String(run.conclusion))
  );
}

async function downloadJobLog(options: {
  githubToken: string;
  repository: RepositoryRef;
  jobId: number;
}): Promise<string> {
  const response = await fetch(
    `https://api.github.com/repos/${options.repository.owner}/${options.repository.repo}/actions/jobs/${options.jobId}/logs`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${options.githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "maintainer-kit-ci-fix"
      },
      redirect: "follow"
    }
  );

  if (!response.ok) {
    throw new Error(
      `Could not download logs for workflow job ${options.jobId}: HTTP ${response.status}`
    );
  }

  return response.text();
}

export function sanitizeCiJobLog(log: string): string {
  return redactSecrets(log).replace(ansiColorPattern, "").replace(/\r\n/g, "\n");
}

export function truncateCiLog(
  value: string,
  maxChars: number
): { value: string; truncated: boolean } {
  if (value.length <= maxChars) {
    return { value, truncated: false };
  }

  const headLength = Math.floor(maxChars * 0.25);
  const tailLength = maxChars - headLength;
  return {
    value: `${value.slice(0, headLength)}\n\n[... CI log truncated ...]\n\n${value.slice(
      -tailLength
    )}`,
    truncated: true
  };
}
