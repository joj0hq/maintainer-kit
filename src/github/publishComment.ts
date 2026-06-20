import type { CommentMode } from "../config/schema.js";
import type { Logger } from "../utils/logger.js";
import type { RepositoryRef } from "./context.js";
import { findExistingComment } from "./findExistingComment.js";

export interface PublishCommentOptions {
  octokit: any;
  repository: RepositoryRef;
  issueNumber: number;
  body: string;
  marker: string;
  commentMode: CommentMode;
  dryRun: boolean;
  logger: Logger;
}

export type PublishResult = "created" | "updated" | "skipped" | "dry-run";

export async function publishComment(options: PublishCommentOptions): Promise<PublishResult> {
  if (options.dryRun) {
    options.logger.info("Dry-run mode enabled. Rendered comment follows.");
    options.logger.info(options.body);
    return "dry-run";
  }

  if (options.commentMode === "none") {
    options.logger.info("comment-mode is none. Skipping GitHub comment publishing.");
    return "skipped";
  }

  if (options.commentMode === "create") {
    await createComment(options);
    return "created";
  }

  const existing = await findExistingComment(
    options.octokit,
    options.repository,
    options.issueNumber,
    options.marker
  );

  if (existing) {
    await options.octokit.rest.issues.updateComment({
      owner: options.repository.owner,
      repo: options.repository.repo,
      comment_id: existing.id,
      body: options.body
    });
    return "updated";
  }

  await createComment(options);
  return "created";
}

async function createComment(options: PublishCommentOptions): Promise<void> {
  await options.octokit.rest.issues.createComment({
    owner: options.repository.owner,
    repo: options.repository.repo,
    issue_number: options.issueNumber,
    body: options.body
  });
}
