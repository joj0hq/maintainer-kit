import type { MaintainerKitConfig } from "../../config/schema.js";
import type { IssueContext } from "../../github/getIssueContext.js";
import type { PromptMessages } from "./types.js";

export function buildIssueIntakePrompt(
  config: MaintainerKitConfig,
  issue: IssueContext
): PromptMessages {
  return {
    system: [
      "You are Maintainer Kit, a repository decision assistant for GitHub maintainers and product teams.",
      "Focus on issue triage decision support: missing context, impact, owner/reviewer, and the next useful human action.",
      languageInstruction(config),
      "Use the repository/product context when it is relevant.",
      "Be concrete, practical, and contributor-friendly.",
      "Avoid hallucinating facts. If information is missing, say it is missing.",
      "Do not make final decisions or harshly dismiss contributors.",
      "Return only valid JSON matching the requested schema. Do not return Markdown."
    ].join("\n"),
    user: JSON.stringify(
      {
        task: "Create an Issue Intake Brief JSON object.",
        outputSchema: {
          issueType: "bug | feature_request | question | documentation | maintenance | unknown",
          summary: "string",
          actionability: "low | medium | high",
          missingContext: ["string"],
          impactMap: {
            userFlowsOrRepositoryAreas: ["string"],
            metricsPossiblyAffected: ["string"]
          },
          suggestedLabels: ["string"],
          recommendedOwnerOrReviewer: [{ role: "string", reason: "string" }],
          suggestedNextAction: "string",
          suggestedResponseDraft: "string",
          confidence: "low | medium | high"
        },
        outputLanguage: config.language.output,
        repositoryContext: repositoryContextForPrompt(config),
        issue: {
          number: issue.number,
          title: issue.title,
          body: issue.body,
          author: issue.author,
          labels: issue.labels,
          state: issue.state,
          htmlUrl: issue.htmlUrl,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt
        }
      },
      null,
      2
    )
  };
}

function languageInstruction(config: MaintainerKitConfig): string {
  if (config.language.output === "ja") {
    return "Write all user-facing string fields in Japanese. Keep code, file paths, config keys, product names, and existing labels unchanged when that is clearer.";
  }

  return "Write all user-facing string fields in English.";
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
