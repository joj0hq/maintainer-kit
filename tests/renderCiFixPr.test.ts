import { describe, expect, it } from "vitest";
import {
  CI_FIX_PR_MARKER,
  renderCiFixPrBody,
  renderCiFixPrComment
} from "../src/render/renderCiFixPr.js";

const failure = {
  pullRequest: {
    number: 42,
    title: "Fix config parsing",
    body: "Updates config parsing.",
    htmlUrl: "https://github.com/owner/repo/pull/42",
    baseRef: "main",
    headRef: "feature/config",
    headSha: "abc123",
    author: "octocat",
    labels: ["bug"]
  },
  run: {
    id: 100,
    name: "Test",
    htmlUrl: "https://github.com/owner/repo/actions/runs/100",
    conclusion: "failure",
    headSha: "abc123"
  },
  failedJobs: [
    {
      id: 200,
      name: "test",
      conclusion: "failure",
      htmlUrl: "https://github.com/owner/repo/actions/jobs/200",
      log: "TypeScript error",
      logWasTruncated: false
    }
  ]
};

const draft = {
  shouldCreatePr: true,
  skipReason: "",
  title: "Fix config type error",
  summary: "Corrects the type mismatch reported by CI.",
  failureAnalysis: ["The function returns a string where a number is required."],
  files: [
    {
      path: "src/config.ts",
      content: "export const value = 1;\n",
      purpose: "Correct the return type"
    }
  ],
  validationNotes: ["Expected the normal typecheck job to validate the change."],
  maintainerNotes: ["Review the intended config behavior."],
  confidence: "high" as const
};

describe("renderCiFixPr", () => {
  it("renders a stacked draft PR body", () => {
    const output = renderCiFixPrBody({
      draft,
      failure,
      generatedFiles: ["src/config.ts"]
    });

    expect(output).toContain("## Maintainer Kit CI Fix");
    expect(output).toContain("Original PR: #42");
    expect(output).toContain("Target branch: `feature/config`");
    expect(output).toContain("did not execute repository code");
  });

  it("renders a Japanese source PR comment", () => {
    const output = renderCiFixPrComment({
      draft,
      prUrl: "https://github.com/owner/repo/pull/43",
      language: "ja"
    });

    expect(output).toContain(CI_FIX_PR_MARKER);
    expect(output).toContain("小さなdraft PRを作成しました");
    expect(output).toContain("https://github.com/owner/repo/pull/43");
  });
});
