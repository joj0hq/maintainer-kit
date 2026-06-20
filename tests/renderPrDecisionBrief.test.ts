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

  it("renders Japanese labels when requested", () => {
    const output = renderPrDecisionBrief({
      diffWasTruncated: true,
      language: "ja",
      brief: {
        summary: "チェックアウト処理を更新します",
        decisionNeeded: "QA範囲を確認する必要があります",
        impactMap: {
          userFlows: ["購入"],
          productOrRepositoryAreas: ["決済"],
          metricsPossiblyAffected: [],
          technicalAreas: []
        },
        missingContext: [],
        recommendedReviewers: [],
        qaChecklist: [],
        suggestedNextAction: "QA結果を依頼する",
        suggestedResponseDraft: "sandboxでの確認結果を追加してください。",
        confidence: "medium"
      }
    });

    expect(output).toContain("## Maintainer Kit 判断ブリーフ");
    expect(output).toContain("注: 設定されたサイズ上限");
    expect(output).toContain("### 必要な判断");
    expect(output).toContain("- [ ] 対象に合わせた確認項目を追加してください。");
  });
});
