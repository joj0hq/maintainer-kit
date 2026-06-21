import type { MaintainerKitConfig } from "../config/schema.js";
import type { ActionContextLike } from "../github/context.js";

export interface CiFixTrigger {
  triggered: boolean;
  reason: string;
}

const trustedCommentAuthorAssociations = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);

export function getCiFixTrigger(
  context: ActionContextLike,
  config: MaintainerKitConfig
): CiFixTrigger {
  if (!config.features.ci_fix_pr) {
    return { triggered: false, reason: "CI fix PR feature is disabled" };
  }

  if (context.eventName !== "issue_comment" || context.payload.action !== "created") {
    return { triggered: false, reason: "unsupported event for CI fix PR" };
  }

  if (!isPullRequestIssue(context.payload.issue)) {
    return { triggered: false, reason: "issue_comment target is not a pull request" };
  }

  const expectedCommand = config.agent.ci_fix_pr.trigger_comment;
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
    reason: `trusted comment command ${expectedCommand} was posted`
  };
}

function isPullRequestIssue(issue: unknown): boolean {
  return Boolean(issue && typeof issue === "object" && "pull_request" in issue);
}
