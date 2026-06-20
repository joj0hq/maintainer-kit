import type { ActionContextLike, RepositoryRef } from "./context.js";
import { getRepository } from "./context.js";

export interface IssueContext {
  repository: RepositoryRef;
  number: number;
  title: string;
  body: string;
  author: string;
  labels: string[];
  state: string;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
}

export function getIssueContext(context: ActionContextLike): IssueContext {
  const issue = context.payload.issue;
  if (!issue) {
    throw new Error("Issue payload is missing from the GitHub event.");
  }

  return {
    repository: getRepository(context),
    number: issue.number,
    title: issue.title ?? "",
    body: issue.body ?? "",
    author: issue.user?.login ?? "unknown",
    labels: normalizeLabels(issue.labels),
    state: issue.state ?? "unknown",
    htmlUrl: issue.html_url ?? "",
    createdAt: issue.created_at ?? "",
    updatedAt: issue.updated_at ?? ""
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

