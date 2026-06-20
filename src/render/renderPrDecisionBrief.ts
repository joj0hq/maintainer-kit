import type { PrDecisionBrief } from "../ai/schemas/prDecisionBriefSchema.js";
import { renderBulletList, renderChecklist, renderQuotedDraft, sanitizeMarkdownText } from "./markdown.js";

export const PR_DECISION_BRIEF_MARKER = "<!-- maintainer-kit:decision-brief -->";

export interface RenderPrDecisionBriefOptions {
  brief: PrDecisionBrief;
  diffWasTruncated: boolean;
}

export function renderPrDecisionBrief(options: RenderPrDecisionBriefOptions): string {
  const { brief, diffWasTruncated } = options;

  const truncationNote = diffWasTruncated
    ? "\n\nNote: Some diff content was truncated because of configured size limits."
    : "";

  return `${PR_DECISION_BRIEF_MARKER}
## Maintainer Kit Decision Brief

This is an AI-generated Decision Brief. Please review before taking action.${truncationNote}

### Summary

${sanitizeMarkdownText(brief.summary) || "Not specified."}

### Decision Needed

${sanitizeMarkdownText(brief.decisionNeeded) || "Not specified."}

### Impact Map

**User flows**

${renderBulletList(brief.impactMap.userFlows)}

**Product / repository areas**

${renderBulletList(brief.impactMap.productOrRepositoryAreas)}

**Metrics possibly affected**

${renderBulletList(brief.impactMap.metricsPossiblyAffected)}

**Technical areas**

${renderBulletList(brief.impactMap.technicalAreas)}

### Missing Context

${renderBulletList(brief.missingContext)}

### Recommended Reviewers

${renderBulletList(brief.recommendedReviewers.map((reviewer) => `${reviewer.role}: ${reviewer.reason}`))}

### QA Checklist

${renderChecklist(brief.qaChecklist)}

### Suggested Next Action

${sanitizeMarkdownText(brief.suggestedNextAction) || "Not specified."}

### Suggested Response Draft

${renderQuotedDraft(brief.suggestedResponseDraft)}
`;
}

