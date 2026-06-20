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
      suggestedResponseDraft: "Could you share reproduction steps?"
    });

    expect(output).toContain("<!-- maintainer-kit:issue-intake-brief -->");
    expect(output).toContain("## Maintainer Kit Issue Intake Brief");
    expect(output).toContain("### Missing Context");
    expect(output).toContain("- Reproduction steps");
    expect(output).not.toContain("hidden");
  });
});
