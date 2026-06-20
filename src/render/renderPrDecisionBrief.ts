import type { PrDecisionBrief } from "../ai/schemas/prDecisionBriefSchema.js";
import type { OutputLanguage } from "../config/schema.js";
import {
  renderBulletList,
  renderChecklist,
  renderQuotedDraft,
  sanitizeMarkdownText
} from "./markdown.js";

export const PR_DECISION_BRIEF_MARKER = "<!-- maintainer-kit:decision-brief -->";

export interface RenderPrDecisionBriefOptions {
  brief: PrDecisionBrief;
  diffWasTruncated: boolean;
  language?: OutputLanguage;
}

const copy = {
  en: {
    title: "Maintainer Kit Decision Brief",
    disclaimer: "This is an AI-generated Decision Brief. Please review before taking action.",
    truncationNote: "Note: Some diff content was truncated because of configured size limits.",
    summary: "Summary",
    decisionNeeded: "Decision Needed",
    impactMap: "Impact Map",
    userFlows: "User flows",
    productOrRepositoryAreas: "Product / repository areas",
    metricsPossiblyAffected: "Metrics possibly affected",
    technicalAreas: "Technical areas",
    missingContext: "Missing Context",
    recommendedReviewers: "Recommended Reviewers",
    qaChecklist: "QA Checklist",
    suggestedNextAction: "Suggested Next Action",
    suggestedResponseDraft: "Suggested Response Draft",
    notSpecified: "Not specified.",
    noneIdentified: "None identified.",
    emptyChecklist: "Add a targeted verification case.",
    emptyItem: "Not specified"
  },
  ja: {
    title: "Maintainer Kit 判断ブリーフ",
    disclaimer: "これはAI生成の判断ブリーフです。対応前に内容を確認してください。",
    truncationNote: "注: 設定されたサイズ上限により、一部のdiff内容は切り詰められています。",
    summary: "要約",
    decisionNeeded: "必要な判断",
    impactMap: "影響範囲",
    userFlows: "ユーザーフロー",
    productOrRepositoryAreas: "プロダクト / リポジトリ領域",
    metricsPossiblyAffected: "影響する可能性のある指標",
    technicalAreas: "技術領域",
    missingContext: "不足している文脈",
    recommendedReviewers: "推奨レビュアー",
    qaChecklist: "QA チェックリスト",
    suggestedNextAction: "推奨される次のアクション",
    suggestedResponseDraft: "返信ドラフト",
    notSpecified: "未指定です。",
    noneIdentified: "特になし。",
    emptyChecklist: "対象に合わせた確認項目を追加してください。",
    emptyItem: "未指定"
  }
} satisfies Record<OutputLanguage, Record<string, string>>;

export function renderPrDecisionBrief(options: RenderPrDecisionBriefOptions): string {
  const { brief, diffWasTruncated } = options;
  const language = options.language ?? "en";
  const labels = copy[language];

  const truncationNote = diffWasTruncated ? `\n\n${labels.truncationNote}` : "";

  return `${PR_DECISION_BRIEF_MARKER}
## ${labels.title}

${labels.disclaimer}${truncationNote}

### ${labels.summary}

${sanitizeMarkdownText(brief.summary) || labels.notSpecified}

### ${labels.decisionNeeded}

${sanitizeMarkdownText(brief.decisionNeeded) || labels.notSpecified}

### ${labels.impactMap}

**${labels.userFlows}**

${renderBulletList(brief.impactMap.userFlows, labels.noneIdentified, labels.emptyItem)}

**${labels.productOrRepositoryAreas}**

${renderBulletList(brief.impactMap.productOrRepositoryAreas, labels.noneIdentified, labels.emptyItem)}

**${labels.metricsPossiblyAffected}**

${renderBulletList(brief.impactMap.metricsPossiblyAffected, labels.noneIdentified, labels.emptyItem)}

**${labels.technicalAreas}**

${renderBulletList(brief.impactMap.technicalAreas, labels.noneIdentified, labels.emptyItem)}

### ${labels.missingContext}

${renderBulletList(brief.missingContext, labels.noneIdentified, labels.emptyItem)}

### ${labels.recommendedReviewers}

${renderBulletList(
  brief.recommendedReviewers.map((reviewer) => `${reviewer.role}: ${reviewer.reason}`),
  labels.noneIdentified,
  labels.emptyItem
)}

### ${labels.qaChecklist}

${renderChecklist(brief.qaChecklist, labels.emptyChecklist, labels.emptyItem)}

### ${labels.suggestedNextAction}

${sanitizeMarkdownText(brief.suggestedNextAction) || labels.notSpecified}

### ${labels.suggestedResponseDraft}

${renderQuotedDraft(brief.suggestedResponseDraft, labels.notSpecified)}
`;
}
