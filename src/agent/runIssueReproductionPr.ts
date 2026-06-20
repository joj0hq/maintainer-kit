import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { generateStructuredJson } from "../ai/client.js";
import { buildIssueReproductionPrPrompt } from "../ai/prompts/buildIssueReproductionPrPrompt.js";
import {
  issueReproductionPrSchema,
  type IssueReproductionPrDraft
} from "../ai/schemas/issueReproductionPrSchema.js";
import type { CommentMode, MaintainerKitConfig } from "../config/schema.js";
import type { RepositoryRef } from "../github/context.js";
import type { IssueContext } from "../github/getIssueContext.js";
import { publishComment, type PublishResult } from "../github/publishComment.js";
import { redactSecrets } from "../privacy/redactSecrets.js";
import {
  buildIssueReproductionPrTitle,
  ISSUE_REPRODUCTION_PR_MARKER,
  renderIssueReproductionPrBody,
  renderIssueReproductionPrComment
} from "../render/renderIssueReproductionPr.js";
import type { Logger } from "../utils/logger.js";
import { commitAndPushDraftBranch, ensureCleanWorkingTree } from "./gitDraftPr.js";
import { validateGeneratedFiles, type GeneratedFile } from "./pathGuards.js";
import { collectRepositoryContext } from "./repositoryContext.js";

export interface RunIssueReproductionPrOptions {
  octokit: any;
  repository: RepositoryRef;
  issue: IssueContext;
  config: MaintainerKitConfig;
  openAiApiKey: string;
  model?: string;
  commentMode: CommentMode;
  dryRun: boolean;
  logger: Logger;
  defaultBranch?: string;
}

export interface RunIssueReproductionPrResult {
  created: boolean;
  pullRequestUrl?: string;
  skippedReason?: string;
  commentResult: PublishResult | "skipped";
  files: string[];
}

export async function runIssueReproductionPr(
  options: RunIssueReproductionPrOptions
): Promise<RunIssueReproductionPrResult> {
  const repositoryContext = await collectRepositoryContext(options.config);
  const prompt = buildIssueReproductionPrPrompt(options.config, options.issue, repositoryContext);
  const draft = await generateStructuredJson<IssueReproductionPrDraft>({
    apiKey: options.openAiApiKey,
    model: options.model,
    prompt,
    schema: issueReproductionPrSchema
  });

  if (!draft.shouldCreatePr) {
    options.logger.info(`Issue reproduction PR skipped: ${draft.skipReason}`);
    return {
      created: false,
      skippedReason: draft.skipReason,
      commentResult: "skipped",
      files: []
    };
  }

  const files = validateAndPrepareFiles(draft.files, options.config);
  const generatedPaths = files.map((file) => file.path);
  const branchName = buildBranchName(
    options.config.agent.issue_reproduction_pr.branch_prefix,
    options.issue.number
  );
  const title = buildIssueReproductionPrTitle(options.issue, options.config.language.output);
  const body = renderIssueReproductionPrBody({
    draft,
    issue: options.issue,
    generatedFiles: generatedPaths,
    language: options.config.language.output
  });

  if (options.dryRun) {
    options.logger.info(`Dry run: would create branch ${branchName}`);
    options.logger.info(`Dry run: would create draft PR "${title}"`);
    options.logger.info(body);
    return {
      created: false,
      skippedReason: "dry-run",
      commentResult: "dry-run",
      files: generatedPaths
    };
  }

  await ensureCleanWorkingTree();
  await writeGeneratedFiles(files);
  await commitAndPushDraftBranch({
    branchName,
    files: generatedPaths,
    commitMessage: `Add reproduction for issue #${options.issue.number}`
  });

  const pullRequest = await options.octokit.rest.pulls.create({
    owner: options.repository.owner,
    repo: options.repository.repo,
    title,
    head: branchName,
    base: options.defaultBranch || "main",
    body,
    draft: true,
    maintainer_can_modify: true
  });

  const pullRequestUrl = String(pullRequest.data.html_url);
  const commentResult = await publishComment({
    octokit: options.octokit,
    repository: options.repository,
    issueNumber: options.issue.number,
    marker: ISSUE_REPRODUCTION_PR_MARKER,
    body: renderIssueReproductionPrComment({
      draft,
      prUrl: pullRequestUrl,
      language: options.config.language.output
    }),
    commentMode: options.commentMode,
    dryRun: false,
    logger: options.logger
  });

  return {
    created: true,
    pullRequestUrl,
    commentResult,
    files: generatedPaths
  };
}

function validateAndPrepareFiles(
  files: GeneratedFile[],
  config: MaintainerKitConfig
): GeneratedFile[] {
  const agentConfig = config.agent.issue_reproduction_pr;
  const preparedFiles = validateGeneratedFiles(files, {
    allowedPaths: agentConfig.allowed_paths,
    blockedPaths: agentConfig.blocked_paths,
    maxFilesChanged: agentConfig.max_files_changed,
    maxFileBytes: agentConfig.max_file_bytes,
    maxTotalBytes: agentConfig.max_total_bytes
  });

  for (const file of preparedFiles) {
    if (config.privacy.redact_secrets && redactSecrets(file.content) !== file.content) {
      throw new Error(
        `Issue reproduction PR generated content that looks like a secret: ${file.path}`
      );
    }
  }

  return preparedFiles;
}

async function writeGeneratedFiles(files: GeneratedFile[]): Promise<void> {
  for (const file of files) {
    await mkdir(dirname(file.path), { recursive: true });
    await writeFile(file.path, file.content, "utf8");
  }
}

function buildBranchName(branchPrefix: string, issueNumber: number): string {
  const safePrefix = sanitizeBranchSegment(branchPrefix).replace(/\/+$/, "") || "maintainer-kit";
  const suffix = Date.now().toString(36);
  return `${safePrefix}/issue-${issueNumber}-repro-${suffix}`;
}

function sanitizeBranchSegment(value: string): string {
  return value
    .trim()
    .replaceAll("\\", "/")
    .replace(/[^A-Za-z0-9._/-]+/g, "-")
    .replace(/\.\.+/g, ".")
    .replace(/\/+/g, "/")
    .replace(/^[-/.]+|[-/.]+$/g, "");
}
