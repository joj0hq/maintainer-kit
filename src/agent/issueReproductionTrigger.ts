import type { MaintainerKitConfig } from "../config/schema.js";
import type { ActionContextLike } from "../github/context.js";

export interface IssueReproductionTrigger {
  triggered: boolean;
  source?: "label" | "comment";
  reason: string;
}

const trustedCommentAuthorAssociations = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);

export function getIssueReproductionTrigger(
  context: ActionContextLike,
  config: MaintainerKitConfig
): IssueReproductionTrigger {
  if (!config.features.issue_reproduction_pr) {
    return { triggered: false, reason: "issue reproduction PR feature is disabled" };
  }

  if (isPullRequestIssue(context.payload.issue)) {
    return { triggered: false, reason: "issue_comment target is a pull request" };
  }

  if (context.eventName === "issues" && context.payload.action === "labeled") {
    return getLabelTrigger(context, config);
  }

  if (context.eventName === "issue_comment" && context.payload.action === "created") {
    return getCommentTrigger(context, config);
  }

  return { triggered: false, reason: "unsupported event for issue reproduction PR" };
}

function getLabelTrigger(
  context: ActionContextLike,
  config: MaintainerKitConfig
): IssueReproductionTrigger {
  const expectedLabel = config.agent.issue_reproduction_pr.trigger_label;
  const labelName = context.payload.label?.name;

  if (labelName !== expectedLabel) {
    return { triggered: false, reason: `label is not ${expectedLabel}` };
  }

  return { triggered: true, source: "label", reason: `label ${expectedLabel} was applied` };
}

function getCommentTrigger(
  context: ActionContextLike,
  config: MaintainerKitConfig
): IssueReproductionTrigger {
  const expectedCommand = config.agent.issue_reproduction_pr.trigger_comment;
  const body = String(context.payload.comment?.body ?? "").trim();
  const authorAssociation = String(context.payload.comment?.author_association ?? "");

  if (!body.startsWith(expectedCommand)) {
    return { triggered: false, reason: `comment does not start with ${expectedCommand}` };
  }

  if (!trustedCommentAuthorAssociations.has(authorAssociation)) {
    return {
      triggered: false,
      reason: `comment author association ${authorAssociation || "unknown"} is not trusted`
    };
  }

  return {
    triggered: true,
    source: "comment",
    reason: `trusted comment command ${expectedCommand} was posted`
  };
}

function isPullRequestIssue(issue: unknown): boolean {
  return Boolean(issue && typeof issue === "object" && "pull_request" in issue);
}
