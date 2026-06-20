import type { ActionContextLike, RepositoryRef } from "./context.js";
import { getRepository } from "./context.js";
import { getPullRequestDiff, type PullRequestFile } from "./getPullRequestDiff.js";

export interface PullRequestContext {
  repository: RepositoryRef;
  number: number;
  title: string;
  body: string;
  author: string;
  labels: string[];
  baseBranch: string;
  headBranch: string;
  changedFiles: PullRequestFile[];
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
}

export async function getPullRequestContext(
  octokit: any,
  context: ActionContextLike
): Promise<PullRequestContext> {
  const pullRequest = context.payload.pull_request;
  if (!pullRequest) {
    throw new Error("Pull request payload is missing from the GitHub event.");
  }

  const repository = getRepository(context);
  const changedFiles = await getPullRequestDiff(octokit, repository, pullRequest.number);

  return {
    repository,
    number: pullRequest.number,
    title: pullRequest.title ?? "",
    body: pullRequest.body ?? "",
    author: pullRequest.user?.login ?? "unknown",
    labels: normalizeLabels(pullRequest.labels),
    baseBranch: pullRequest.base?.ref ?? "",
    headBranch: pullRequest.head?.ref ?? "",
    changedFiles,
    htmlUrl: pullRequest.html_url ?? "",
    createdAt: pullRequest.created_at ?? "",
    updatedAt: pullRequest.updated_at ?? ""
  };
}

function normalizeLabels(labels: unknown): string[] {
  if (!Array.isArray(labels)) {
    return [];
  }

  return labels
    .map((label) => {
      if (typeof label === "string") {
        return label;
      }
      if (label && typeof label === "object" && "name" in label && typeof label.name === "string") {
        return label.name;
      }
      return undefined;
    })
    .filter((label): label is string => Boolean(label));
}

