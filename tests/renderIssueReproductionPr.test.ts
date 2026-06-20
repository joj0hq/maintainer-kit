import { describe, expect, it } from "vitest";
import {
  ISSUE_REPRODUCTION_PR_MARKER,
  renderIssueReproductionPrBody,
  renderIssueReproductionPrComment
} from "../src/render/renderIssueReproductionPr.js";

const issue = {
  repository: { owner: "owner", repo: "repo" },
  number: 123,
  title: "Config parsing fails",
  body: "The config parser crashes with nested values.",
  author: "octocat",
  labels: ["bug"],
  state: "open",
  htmlUrl: "https://github.com/owner/repo/issues/123",
  createdAt: "2026-06-20T00:00:00Z",
  updatedAt: "2026-06-20T00:00:00Z"
};

const draft = {
  shouldCreatePr: true,
  skipReason: "",
  title: "Add config parser reproduction",
  summary: "Adds a failing regression test for the config parsing issue.",
  evidenceUsed: ["Issue body describes nested config values."],
  files: [
    {
      path: "tests/config-repro.test.ts",
      content: "test('repro', () => {})\n",
      purpose: "failing regression test"
    }
  ],
  validationNotes: [],
  maintainerNotes: ["This PR intentionally does not fix the bug."],
  confidence: "medium" as const
};

describe("renderIssueReproductionPr", () => {
  it("renders a stable draft PR body", () => {
    const output = renderIssueReproductionPrBody({
      draft,
      issue,
      generatedFiles: ["tests/config-repro.test.ts"]
    });

    expect(output).toContain("## Maintainer Kit Reproduction PR");
    expect(output).toContain("Related: #123");
    expect(output).toContain("- tests/config-repro.test.ts");
    expect(output).toContain("Maintainer Kit did not run project validation commands");
  });

  it("renders a Japanese issue comment", () => {
    const output = renderIssueReproductionPrComment({
      draft,
      prUrl: "https://github.com/owner/repo/pull/456",
      language: "ja"
    });

    expect(output).toContain(ISSUE_REPRODUCTION_PR_MARKER);
    expect(output).toContain("draft の再現 PR を作成しました");
    expect(output).toContain("https://github.com/owner/repo/pull/456");
  });
});
