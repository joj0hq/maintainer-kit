import { describe, expect, it } from "vitest";
import { renderIssueIntakeBrief } from "../src/render/renderIssueIntakeBrief.js";

describe("renderIssueIntakeBrief", () => {
  it("renders the fixed issue brief structure", () => {
    const output = renderIssueIntakeBrief({
      issueType: "bug",
      summary: "Login fails <!-- hidden --> for new users",
      actionability: "medium",
      missingContext: ["Reproduction steps"],
      impactMap: {
        userFlowsOrRepositoryAreas: ["authentication"],
        metricsPossiblyAffected: ["task_completion_rate"]
      },
      suggestedLabels: ["bug"],
      recommendedOwnerOrReviewer: [{ role: "QA", reason: "Needs reproduction coverage" }],
      suggestedNextAction: "Ask for steps",
      suggestedResponseDraft: "Could you share reproduction steps?",
      confidence: "medium"
    });

    expect(output).toContain("<!-- maintainer-kit:issue-intake-brief -->");
    expect(output).toContain("## Maintainer Kit Issue Intake Brief");
    expect(output).toContain("### Missing Context");
    expect(output).toContain("- Reproduction steps");
    expect(output).not.toContain("hidden");
  });

  it("renders Japanese labels when requested", () => {
    const output = renderIssueIntakeBrief(
      {
        issueType: "bug",
        summary: "ログインに失敗します",
        actionability: "high",
        missingContext: [],
        impactMap: {
          userFlowsOrRepositoryAreas: ["認証"],
          metricsPossiblyAffected: []
        },
        suggestedLabels: ["bug"],
        recommendedOwnerOrReviewer: [],
        suggestedNextAction: "再現手順を確認する",
        suggestedResponseDraft: "再現手順を共有してもらえますか？",
        confidence: "high"
      },
      { language: "ja" }
    );

    expect(output).toContain("## Maintainer Kit Issue 整理ブリーフ");
    expect(output).toContain("### 不足している文脈");
    expect(output).toContain("- 特になし。");
    expect(output).toContain("### 推奨される次のアクション");
  });
});
