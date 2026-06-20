import type { IssueIntakeBrief } from "../ai/schemas/issueIntakeBriefSchema.js";
import { renderBulletList, renderQuotedDraft, sanitizeMarkdownText } from "./markdown.js";

export const ISSUE_INTAKE_BRIEF_MARKER = "<!-- maintainer-kit:issue-intake-brief -->";

const issueTypeLabels: Record<IssueIntakeBrief["issueType"], string> = {
  bug: "Bug",
  feature_request: "Feature Request",
  question: "Question",
  documentation: "Documentation",
  maintenance: "Maintenance",
  unknown: "Unknown"
};

const actionabilityLabels: Record<IssueIntakeBrief["actionability"], string> = {
  high: "High",
  medium: "Medium",
  low: "Low"
};

export function renderIssueIntakeBrief(brief: IssueIntakeBrief): string {
  return `${ISSUE_INTAKE_BRIEF_MARKER}
## Maintainer Kit Issue Intake Brief

This is an AI-generated Issue Intake Brief. Please review before taking action.

### Issue Type

${issueTypeLabels[brief.issueType]}

### Summary

${sanitizeMarkdownText(brief.summary) || "Not specified."}

### Actionability

${actionabilityLabels[brief.actionability]}

### Missing Context

${renderBulletList(brief.missingContext)}

### Impact Map

**User flows or repository areas**

${renderBulletList(brief.impactMap.userFlowsOrRepositoryAreas)}

**Metrics possibly affected**

${renderBulletList(brief.impactMap.metricsPossiblyAffected)}

### Suggested Labels

${renderBulletList(brief.suggestedLabels)}

### Recommended Owner / Reviewer

${renderBulletList(brief.recommendedOwnerOrReviewer.map((reviewer) => `${reviewer.role}: ${reviewer.reason}`))}

### Suggested Next Action

${sanitizeMarkdownText(brief.suggestedNextAction) || "Not specified."}

### Suggested Response Draft

${renderQuotedDraft(brief.suggestedResponseDraft)}
`;
}
