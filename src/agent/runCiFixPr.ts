import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getCiFailureContext, type CiFailureContext } from "./ciFailureContext.js";
import { checkoutPullRequestHead, commitAndPushDraftBranch } from "./gitDraftPr.js";
import { validateGeneratedFiles, type GeneratedFile } from "./pathGuards.js";
import {
  collectRepositoryContextForAgent,
  type RepositoryContextSnapshot
} from "./repositoryContext.js";
import { generateStructuredJson } from "../ai/client.js";
import { buildCiFixPrPrompt } from "../ai/prompts/buildCiFixPrPrompt.js";
import { ciFixPrSchema, type CiFixPrDraft } from "../ai/schemas/ciFixPrSchema.js";
import type { CommentMode, MaintainerKitConfig } from "../config/schema.js";
import type { RepositoryRef } from "../github/context.js";
import { getPullRequestDiff } from "../github/getPullRequestDiff.js";
import { publishComment, type PublishResult } from "../github/publishComment.js";
import { filterFiles } from "../privacy/filterFiles.js";
import { redactSecrets, redactSecretsInFiles } from "../privacy/redactSecrets.js";
import { truncateDiff } from "../privacy/truncateDiff.js";
import {
  buildCiFixPrTitle,
  CI_FIX_PR_MARKER,
  renderCiFixPrBody,
  renderCiFixPrComment
} from "../render/renderCiFixPr.js";
import type { Logger } from "../utils/logger.js";

export interface RunCiFixPrOptions {
  octokit: any;
  githubToken: string;
  repository: RepositoryRef;
  pullRequestNumber: number;
  config: MaintainerKitConfig;
  openAiApiKey: string;
  model?: string;
  commentMode: CommentMode;
  dryRun: boolean;
  logger: Logger;
}

export interface RunCiFixPrResult {
  created: boolean;
  pullRequestUrl?: string;
  skippedReason?: string;
  commentResult: PublishResult | "skipped";
  files: string[];
}

export async function runCiFixPr(options: RunCiFixPrOptions): Promise<RunCiFixPrResult> {
  const failure = await getCiFailureContext({
    octokit: options.octokit,
    githubToken: options.githubToken,
    repository: options.repository,
    pullRequestNumber: options.pullRequestNumber,
    config: options.config
  });
  const branchPrefix = buildCiFixBranchPrefix(
    options.config.agent.ci_fix_pr.branch_prefix,
    failure.pullRequest.number
  );
  const existingPullRequest = await findExistingCiFixPullRequest(
    options.octokit,
    options.repository,
    failure.pullRequest.headRef,
    branchPrefix
  );

  if (existingPullRequest) {
    options.logger.info(`An open CI fix PR already exists: ${existingPullRequest.html_url}`);
    return {
      created: false,
      pullRequestUrl: existingPullRequest.html_url,
      skippedReason: "existing-open-ci-fix-pr",
      commentResult: "skipped",
      files: []
    };
  }

  await checkoutPullRequestHead({
    headRef: failure.pullRequest.headRef,
    headSha: failure.pullRequest.headSha
  });

  const repositoryContext = redactRepositoryContext(
    await collectRepositoryContextForAgent(options.config, options.config.agent.ci_fix_pr),
    options.config.privacy.redact_secrets
  );
  const changedFiles = await getPullRequestDiff(
    options.octokit,
    options.repository,
    failure.pullRequest.number
  );
  const filteredFiles = filterFiles(changedFiles, options.config.privacy.exclude_files);
  const redactedFiles = options.config.privacy.redact_secrets
    ? redactSecretsInFiles(filteredFiles)
    : filteredFiles;
  const diff = truncateDiff(redactedFiles, {
    maxDiffLines: Math.min(
      options.config.privacy.max_diff_lines,
      options.config.agent.ci_fix_pr.max_diff_lines
    ),
    maxDiffChars: Math.min(
      options.config.privacy.max_diff_chars,
      options.config.agent.ci_fix_pr.max_diff_chars
    )
  });
  const sanitizedFailure = redactFailureContext(failure, options.config.privacy.redact_secrets);
  const prompt = buildCiFixPrPrompt(options.config, sanitizedFailure, repositoryContext, diff);
  const draft = await generateStructuredJson<CiFixPrDraft>({
    apiKey: options.openAiApiKey,
    model: options.model,
    prompt,
    schema: ciFixPrSchema
  });

  if (!draft.shouldCreatePr) {
    options.logger.info(`CI fix PR skipped: ${draft.skipReason}`);
    return {
      created: false,
      skippedReason: draft.skipReason,
      commentResult: "skipped",
      files: []
    };
  }

  const files = await removeUnchangedFiles(validateAndPrepareFiles(draft.files, options.config));
  if (files.length === 0) {
    options.logger.info("CI fix PR skipped because the generated files contain no changes.");
    return {
      created: false,
      skippedReason: "generated-no-op",
      commentResult: "skipped",
      files: []
    };
  }

  const generatedPaths = files.map((file) => file.path);
  const branchName = `${branchPrefix}${Date.now().toString(36)}`;
  const title = buildCiFixPrTitle(failure.pullRequest.number, options.config.language.output);
  const body = renderCiFixPrBody({
    draft,
    failure: sanitizedFailure,
    generatedFiles: generatedPaths,
    language: options.config.language.output
  });

  if (options.dryRun) {
    options.logger.info(`Dry run: would create branch ${branchName}`);
    options.logger.info(`Dry run: would create stacked draft PR "${title}"`);
    options.logger.info(body);
    return {
      created: false,
      skippedReason: "dry-run",
      commentResult: "dry-run",
      files: generatedPaths
    };
  }

  await writeGeneratedFiles(files);
  await commitAndPushDraftBranch({
    branchName,
    files: generatedPaths,
    commitMessage: `Fix CI for PR #${failure.pullRequest.number}`
  });

  const pullRequest = await options.octokit.rest.pulls.create({
    owner: options.repository.owner,
    repo: options.repository.repo,
    title,
    head: branchName,
    base: failure.pullRequest.headRef,
    body,
    draft: true,
    maintainer_can_modify: true
  });
  const pullRequestUrl = String(pullRequest.data.html_url);
  const commentResult = await publishComment({
    octokit: options.octokit,
    repository: options.repository,
    issueNumber: failure.pullRequest.number,
    marker: CI_FIX_PR_MARKER,
    body: renderCiFixPrComment({
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
  const agentConfig = config.agent.ci_fix_pr;
  const preparedFiles = validateGeneratedFiles(files, {
    allowedPaths: agentConfig.allowed_paths,
    blockedPaths: agentConfig.blocked_paths,
    maxFilesChanged: agentConfig.max_files_changed,
    maxFileBytes: agentConfig.max_file_bytes,
    maxTotalBytes: agentConfig.max_total_bytes,
    allowExistingFiles: true
  });

  for (const file of preparedFiles) {
    if (config.privacy.redact_secrets && redactSecrets(file.content) !== file.content) {
      throw new Error(`CI fix PR generated content that looks like a secret: ${file.path}`);
    }
  }

  return preparedFiles;
}

async function findExistingCiFixPullRequest(
  octokit: any,
  repository: RepositoryRef,
  baseRef: string,
  branchPrefix: string
): Promise<any | undefined> {
  const response = await octokit.rest.pulls.list({
    owner: repository.owner,
    repo: repository.repo,
    state: "open",
    base: baseRef,
    per_page: 100
  });

  return response.data.find((pullRequest: any) =>
    String(pullRequest.head?.ref ?? "").startsWith(branchPrefix)
  );
}

function redactRepositoryContext(
  snapshot: RepositoryContextSnapshot,
  enabled: boolean
): RepositoryContextSnapshot {
  if (!enabled) {
    return snapshot;
  }

  return {
    ...snapshot,
    files: snapshot.files.map((file) => ({
      ...file,
      content: redactSecrets(file.content)
    }))
  };
}

function redactFailureContext(failure: CiFailureContext, enabled: boolean): CiFailureContext {
  if (!enabled) {
    return failure;
  }

  return {
    ...failure,
    pullRequest: {
      ...failure.pullRequest,
      title: redactSecrets(failure.pullRequest.title),
      body: redactSecrets(failure.pullRequest.body)
    }
  };
}

async function writeGeneratedFiles(files: GeneratedFile[]): Promise<void> {
  for (const file of files) {
    await mkdir(dirname(file.path), { recursive: true });
    await writeFile(file.path, file.content, "utf8");
  }
}

async function removeUnchangedFiles(files: GeneratedFile[]): Promise<GeneratedFile[]> {
  const results = await Promise.all(
    files.map(async (file) => {
      try {
        const existingContent = await readFile(file.path, "utf8");
        return existingContent === file.content ? undefined : file;
      } catch (error) {
        if (isFileNotFoundError(error)) {
          return file;
        }
        throw error;
      }
    })
  );

  return results.filter((file): file is GeneratedFile => file !== undefined);
}

function isFileNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as Error & { code?: unknown }).code === "ENOENT"
  );
}

function buildCiFixBranchPrefix(branchPrefix: string, pullRequestNumber: number): string {
  const safePrefix =
    branchPrefix
      .trim()
      .replaceAll("\\", "/")
      .replace(/[^A-Za-z0-9._/-]+/g, "-")
      .replace(/\.\.+/g, ".")
      .replace(/\/+/g, "/")
      .replace(/^[-/.]+|[-/.]+$/g, "") || "maintainer-kit";

  return `${safePrefix}/pr-${pullRequestNumber}-ci-fix-`;
}
