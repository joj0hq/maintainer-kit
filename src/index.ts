import * as core from "@actions/core";
import * as github from "@actions/github";
import { getIssueReproductionTrigger } from "./agent/issueReproductionTrigger.js";
import { runIssueReproductionPr } from "./agent/runIssueReproductionPr.js";
import { generateStructuredJson } from "./ai/client.js";
import { buildIssueIntakePrompt } from "./ai/prompts/buildIssueIntakePrompt.js";
import { buildPrDecisionPrompt } from "./ai/prompts/buildPrDecisionPrompt.js";
import {
  issueIntakeBriefSchema,
  type IssueIntakeBrief
} from "./ai/schemas/issueIntakeBriefSchema.js";
import { prDecisionBriefSchema, type PrDecisionBrief } from "./ai/schemas/prDecisionBriefSchema.js";
import { loadConfig } from "./config/loadConfig.js";
import type {
  CommentMode,
  ExecutionMode,
  MaintainerKitConfig,
  OutputLanguage
} from "./config/schema.js";
import {
  getEventType,
  isSupportedIssueEvent,
  isSupportedIssueReproductionEvent,
  isSupportedPullRequestEvent,
  type ActionContextLike
} from "./github/context.js";
import { getIssueContext, type IssueContext } from "./github/getIssueContext.js";
import { getPullRequestContext, type PullRequestContext } from "./github/getPullRequestContext.js";
import { publishComment } from "./github/publishComment.js";
import { logUsage } from "./metrics/usageLog.js";
import { filterFiles } from "./privacy/filterFiles.js";
import { redactSecrets, redactSecretsInFiles } from "./privacy/redactSecrets.js";
import { truncateDiff, type TruncatedDiff } from "./privacy/truncateDiff.js";
import {
  ISSUE_INTAKE_BRIEF_MARKER,
  renderIssueIntakeBrief
} from "./render/renderIssueIntakeBrief.js";
import { PR_DECISION_BRIEF_MARKER, renderPrDecisionBrief } from "./render/renderPrDecisionBrief.js";
import type { Logger } from "./utils/logger.js";

const logger: Logger = {
  info: (message) => core.info(message),
  warning: (message) => core.warning(message),
  error: (message) => core.error(message)
};

async function run(): Promise<void> {
  const startedAt = Date.now();
  const actionContext = github.context as unknown as ActionContextLike;
  const eventType = getEventType(actionContext);
  const configPath = core.getInput("config-path") || ".maintainer-kit.yml";
  const loadedConfig = await loadConfig(configPath);
  const config = withOutputLanguage(
    loadedConfig,
    core.getInput("output-language") || loadedConfig.language.output
  );

  if (
    !isSupportedIssueEvent(actionContext) &&
    !isSupportedIssueReproductionEvent(actionContext) &&
    !isSupportedPullRequestEvent(actionContext)
  ) {
    core.info(`Unsupported event type: ${eventType}. maintainer-kit did not run.`);
    return;
  }

  const executionMode = parseExecutionMode(core.getInput("mode") || "suggest");
  const commentMode = parseCommentMode(
    core.getInput("comment-mode") || config.behavior.comment_mode
  );
  const dryRun = executionMode === "dry-run" || config.behavior.dry_run;
  if (isSupportedIssueReproductionEvent(actionContext)) {
    const trigger = getIssueReproductionTrigger(actionContext, config);
    if (trigger.triggered) {
      const githubToken = getRequiredInput("github-token");
      const openAiApiKey = getRequiredInput("openai-api-key");
      const model = core.getInput("model") || config.model.name || undefined;
      const octokit = github.getOctokit(githubToken);
      await runIssueReproductionPrHandler({
        octokit,
        context: actionContext,
        config,
        openAiApiKey,
        model,
        commentMode,
        dryRun,
        eventType,
        startedAt
      });
      return;
    }

    if (!isSupportedIssueEvent(actionContext)) {
      core.info(`Issue reproduction PR was not triggered: ${trigger.reason}`);
      return;
    }
  }

  const githubToken = getRequiredInput("github-token");
  const openAiApiKey = getRequiredInput("openai-api-key");
  const model = core.getInput("model") || config.model.name || undefined;
  const octokit = github.getOctokit(githubToken);

  if (isSupportedIssueEvent(actionContext)) {
    await runIssueBrief({
      octokit,
      context: actionContext,
      config,
      openAiApiKey,
      model,
      commentMode,
      dryRun,
      eventType,
      startedAt
    });
    return;
  }

  await runPrBrief({
    octokit,
    context: actionContext,
    config,
    openAiApiKey,
    model,
    commentMode,
    dryRun,
    eventType,
    startedAt
  });
}

interface HandlerOptions {
  octokit: ReturnType<typeof github.getOctokit>;
  context: ActionContextLike;
  config: MaintainerKitConfig;
  openAiApiKey: string;
  model?: string;
  commentMode: CommentMode;
  dryRun: boolean;
  eventType: string;
  startedAt: number;
}

async function runIssueBrief(options: HandlerOptions): Promise<void> {
  if (!options.config.features.issue_intake_brief) {
    logger.info("Issue intake brief feature is disabled. Skipping.");
    return;
  }

  const issue = applyIssuePrivacy(getIssueContext(options.context), options.config);
  const prompt = buildIssueIntakePrompt(options.config, issue);
  const brief = await generateStructuredJson<IssueIntakeBrief>({
    apiKey: options.openAiApiKey,
    model: options.model,
    prompt,
    schema: issueIntakeBriefSchema
  });
  const body = renderIssueIntakeBrief(brief, { language: options.config.language.output });
  const commentResult = await publishComment({
    octokit: options.octokit,
    repository: issue.repository,
    issueNumber: issue.number,
    marker: ISSUE_INTAKE_BRIEF_MARKER,
    body,
    commentMode: options.commentMode,
    dryRun: options.dryRun,
    logger
  });

  logUsage(logger, {
    eventType: options.eventType,
    feature: "issue_intake_brief",
    commentResult,
    durationMs: Date.now() - options.startedAt
  });
}

async function runIssueReproductionPrHandler(options: HandlerOptions): Promise<void> {
  const issue = applyIssuePrivacy(getIssueContext(options.context), options.config);
  const result = await runIssueReproductionPr({
    octokit: options.octokit,
    repository: issue.repository,
    issue,
    config: options.config,
    openAiApiKey: options.openAiApiKey,
    model: options.model,
    commentMode: options.commentMode,
    dryRun: options.dryRun,
    logger,
    defaultBranch: getDefaultBranch(options.context)
  });

  logUsage(logger, {
    eventType: options.eventType,
    feature: "issue_reproduction_pr",
    commentResult: result.commentResult,
    created: result.created,
    files: result.files.length,
    skippedReason: result.skippedReason,
    durationMs: Date.now() - options.startedAt
  });
}

async function runPrBrief(options: HandlerOptions): Promise<void> {
  if (!options.config.features.pr_decision_brief) {
    logger.info("PR decision brief feature is disabled. Skipping.");
    return;
  }

  const pullRequest = applyPullRequestPrivacy(
    await getPullRequestContext(options.octokit, options.context),
    options.config
  );
  const diff = prepareDiff(pullRequest, options.config);
  const prompt = buildPrDecisionPrompt(options.config, pullRequest, diff);
  const brief = await generateStructuredJson<PrDecisionBrief>({
    apiKey: options.openAiApiKey,
    model: options.model,
    prompt,
    schema: prDecisionBriefSchema
  });
  const body = renderPrDecisionBrief({
    brief,
    diffWasTruncated: diff.diffWasTruncated,
    language: options.config.language.output
  });
  const commentResult = await publishComment({
    octokit: options.octokit,
    repository: pullRequest.repository,
    issueNumber: pullRequest.number,
    marker: PR_DECISION_BRIEF_MARKER,
    body,
    commentMode: options.commentMode,
    dryRun: options.dryRun,
    logger
  });

  logUsage(logger, {
    eventType: options.eventType,
    feature: "pr_decision_brief",
    changedFiles: pullRequest.changedFiles.length,
    analyzedFiles: diff.files.filter((file) => Boolean(file.patch)).length,
    diffLinesBeforeTruncation: diff.originalLineCount,
    diffLinesAfterTruncation: diff.retainedLineCount,
    diffWasTruncated: diff.diffWasTruncated,
    commentResult,
    durationMs: Date.now() - options.startedAt
  });
}

function prepareDiff(pullRequest: PullRequestContext, config: MaintainerKitConfig): TruncatedDiff {
  const filteredFiles = filterFiles(pullRequest.changedFiles, config.privacy.exclude_files);
  const redactedFiles = config.privacy.redact_secrets
    ? redactSecretsInFiles(filteredFiles)
    : filteredFiles;

  return truncateDiff(redactedFiles, {
    maxDiffLines: config.privacy.max_diff_lines,
    maxDiffChars: config.privacy.max_diff_chars
  });
}

function applyIssuePrivacy(issue: IssueContext, config: MaintainerKitConfig): IssueContext {
  if (!config.privacy.redact_secrets) {
    return issue;
  }

  return {
    ...issue,
    title: redactSecrets(issue.title),
    body: redactSecrets(issue.body)
  };
}

function applyPullRequestPrivacy(
  pullRequest: PullRequestContext,
  config: MaintainerKitConfig
): PullRequestContext {
  if (!config.privacy.redact_secrets) {
    return pullRequest;
  }

  return {
    ...pullRequest,
    title: redactSecrets(pullRequest.title),
    body: redactSecrets(pullRequest.body)
  };
}

function parseExecutionMode(value: string): ExecutionMode {
  if (value === "suggest" || value === "dry-run") {
    return value;
  }
  throw new Error(`Invalid mode: ${value}. Supported values: suggest, dry-run.`);
}

function parseCommentMode(value: string): CommentMode {
  if (value === "create" || value === "update" || value === "none") {
    return value;
  }
  throw new Error(`Invalid comment-mode: ${value}. Supported values: create, update, none.`);
}

function withOutputLanguage(
  config: MaintainerKitConfig,
  outputLanguage: string
): MaintainerKitConfig {
  return {
    ...config,
    language: {
      ...config.language,
      output: parseOutputLanguage(outputLanguage)
    }
  };
}

function parseOutputLanguage(value: string): OutputLanguage {
  if (value === "en" || value === "ja") {
    return value;
  }
  throw new Error(`Invalid output-language: ${value}. Supported values: en, ja.`);
}

function getDefaultBranch(context: ActionContextLike): string {
  return context.payload.repository?.default_branch ?? "main";
}

function getRequiredInput(name: string): string {
  const value = core.getInput(name);
  if (!value) {
    throw new Error(`Missing required input: ${name}`);
  }
  return value;
}

run().catch((error: unknown) => {
  if (error instanceof Error) {
    core.setFailed(error.message);
    return;
  }
  core.setFailed(String(error));
});
