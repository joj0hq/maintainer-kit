import type { RepositoryContextSnapshot } from "../../agent/repositoryContext.js";
import type { MaintainerKitConfig } from "../../config/schema.js";
import type { IssueContext } from "../../github/getIssueContext.js";
import type { PromptMessages } from "./types.js";

export function buildIssueReproductionPrPrompt(
  config: MaintainerKitConfig,
  issue: IssueContext,
  repositoryContext: RepositoryContextSnapshot
): PromptMessages {
  const agentConfig = config.agent.issue_reproduction_pr;

  return {
    system: [
      "You are Maintainer Kit, a cautious coding agent for maintainers.",
      "Your task is to turn a maintainer-approved Issue into a small draft PR that captures a reproduction or failing regression test.",
      "Prefer adding a new focused test file. If an executable test cannot be inferred safely, add a minimal reproduction artifact or example file only when it is useful.",
      "Do not fix the reported bug. Do not refactor unrelated code. Do not update dependencies. Do not edit CI, secrets, package metadata, or generated bundles.",
      "Use only the allowed paths. If the issue is too vague or unsafe, set shouldCreatePr to false and explain why.",
      "Generated files must be complete file contents, not patches, not Markdown code fences, and not explanations.",
      "Avoid hallucinating repository APIs. Use repository context when available, and say when confidence is low.",
      languageInstruction(config),
      "Return only valid JSON matching the requested schema. Do not return Markdown."
    ].join("\n"),
    user: JSON.stringify(
      {
        task: "Create a small issue reproduction draft PR JSON object.",
        outputSchema: {
          shouldCreatePr: "boolean",
          skipReason: "string",
          title: "string",
          summary: "string",
          evidenceUsed: ["string"],
          files: [{ path: "string", content: "string", purpose: "string" }],
          validationNotes: ["string"],
          maintainerNotes: ["string"],
          confidence: "low | medium | high"
        },
        outputLanguage: config.language.output,
        guardrails: {
          allowedPaths: agentConfig.allowed_paths,
          blockedPaths: agentConfig.blocked_paths,
          maxFilesChanged: agentConfig.max_files_changed,
          maxFileBytes: agentConfig.max_file_bytes,
          maxTotalBytes: agentConfig.max_total_bytes
        },
        repositoryContext: {
          project: config.project,
          critical_flows: config.critical_flows,
          sensitive_areas: config.sensitive_areas,
          fileIndex: repositoryContext.fileIndex,
          files: repositoryContext.files
        },
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
    return "Write all user-facing string fields in Japanese. Keep code, file paths, package names, config keys, and labels unchanged when that is clearer.";
  }

  return "Write all user-facing string fields in English.";
}
