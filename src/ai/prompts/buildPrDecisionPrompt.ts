import type { MaintainerKitConfig } from "../../config/schema.js";
import type { PullRequestContext } from "../../github/getPullRequestContext.js";
import type { TruncatedDiff } from "../../privacy/truncateDiff.js";
import type { PromptMessages } from "./types.js";

export function buildPrDecisionPrompt(
  config: MaintainerKitConfig,
  pullRequest: PullRequestContext,
  diff: TruncatedDiff
): PromptMessages {
  return {
    system: [
      "You are Maintainer Kit, a repository decision assistant for GitHub maintainers and product teams.",
      "Do not provide line-by-line review comments.",
      "Do not provide exact code patches.",
      "Focus on decision support: missing context, impact, QA, reviewers, and the next useful human action.",
      "Use the repository/product context when it is relevant.",
      "Be concrete and practical.",
      "Avoid hallucinating facts. If information is missing, say it is missing.",
      "Return only valid JSON matching the requested schema. Do not return Markdown."
    ].join("\n"),
    user: JSON.stringify(
      {
        task: "Create a PR Decision Brief JSON object.",
        outputSchema: {
          summary: "string",
          decisionNeeded: "string",
          impactMap: {
            userFlows: ["string"],
            productOrRepositoryAreas: ["string"],
            metricsPossiblyAffected: ["string"],
            technicalAreas: ["string"]
          },
          missingContext: ["string"],
          recommendedReviewers: [{ role: "string", reason: "string" }],
          qaChecklist: ["string"],
          suggestedNextAction: "string",
          suggestedResponseDraft: "string",
          confidence: "low | medium | high"
        },
        repositoryContext: repositoryContextForPrompt(config),
        pullRequest: {
          number: pullRequest.number,
          title: pullRequest.title,
          body: pullRequest.body,
          author: pullRequest.author,
          labels: pullRequest.labels,
          baseBranch: pullRequest.baseBranch,
          headBranch: pullRequest.headBranch,
          htmlUrl: pullRequest.htmlUrl,
          createdAt: pullRequest.createdAt,
          updatedAt: pullRequest.updatedAt
        },
        changedFiles: pullRequest.changedFiles.map((file) => ({
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes
        })),
        selectedDiffSnippets: diff.files.map((file) => ({
          filename: file.filename,
          status: file.status,
          patch: file.patch ?? ""
        })),
        diffMetadata: {
          diffWasTruncated: diff.diffWasTruncated,
          originalLineCount: diff.originalLineCount,
          retainedLineCount: diff.retainedLineCount,
          originalCharCount: diff.originalCharCount,
          retainedCharCount: diff.retainedCharCount
        }
      },
      null,
      2
    )
  };
}

function repositoryContextForPrompt(config: MaintainerKitConfig): Record<string, unknown> {
  return {
    project: config.project,
    metrics: config.metrics,
    critical_flows: config.critical_flows,
    sensitive_areas: config.sensitive_areas,
    roles: config.roles
  };
}
