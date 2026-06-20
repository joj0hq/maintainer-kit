import { describe, expect, it } from "vitest";
import { renderPrDecisionBrief } from "../src/render/renderPrDecisionBrief.js";

describe("renderPrDecisionBrief", () => {
  it("renders the fixed PR decision brief structure", () => {
    const output = renderPrDecisionBrief({
      diffWasTruncated: true,
      brief: {
        summary: "Updates checkout behavior",
        decisionNeeded: "Confirm payment QA scope",
        impactMap: {
          userFlows: ["checkout"],
          productOrRepositoryAreas: ["payment"],
          metricsPossiblyAffected: ["trial_conversion"],
          technicalAreas: ["billing API"]
        },
        missingContext: ["Rollback plan"],
        recommendedReviewers: [{ role: "QA", reason: "Payment flow changed" }],
        qaChecklist: ["Complete a sandbox checkout"],
        suggestedNextAction: "Request QA evidence",
        suggestedResponseDraft: "Please add sandbox checkout results.",
        confidence: "high"
      }
    });

    expect(output).toContain("<!-- maintainer-kit:decision-brief -->");
    expect(output).toContain("## Maintainer Kit Decision Brief");
    expect(output).toContain("Note: Some diff content was truncated");
    expect(output).toContain("- [ ] Complete a sandbox checkout");
  });
});
