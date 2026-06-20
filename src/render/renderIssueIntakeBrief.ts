import type { IssueIntakeBrief } from "../ai/schemas/issueIntakeBriefSchema.js";
import type { OutputLanguage } from "../config/schema.js";
import { renderBulletList, renderQuotedDraft, sanitizeMarkdownText } from "./markdown.js";

export const ISSUE_INTAKE_BRIEF_MARKER = "<!-- maintainer-kit:issue-intake-brief -->";

interface RenderIssueIntakeBriefOptions {
  language?: OutputLanguage;
}

const issueTypeLabels: Record<OutputLanguage, Record<IssueIntakeBrief["issueType"], string>> = {
  en: {
    bug: "Bug",
    feature_request: "Feature Request",
    question: "Question",
    documentation: "Documentation",
    maintenance: "Maintenance",
    unknown: "Unknown"
  },
  ja: {
    bug: "バグ",
    feature_request: "機能リクエスト",
    question: "質問",
    documentation: "ドキュメント",
    maintenance: "メンテナンス",
    unknown: "不明"
  }
};

const actionabilityLabels: Record<
  OutputLanguage,
  Record<IssueIntakeBrief["actionability"], string>
> = {
  en: {
    high: "High",
    medium: "Medium",
    low: "Low"
  },
  ja: {
    high: "高",
    medium: "中",
    low: "低"
  }
};

const copy = {
  en: {
    title: "Maintainer Kit Issue Intake Brief",
    disclaimer: "This is an AI-generated Issue Intake Brief. Please review before taking action.",
    issueType: "Issue Type",
    summary: "Summary",
    actionability: "Actionability",
    missingContext: "Missing Context",
    impactMap: "Impact Map",
    userFlowsOrRepositoryAreas: "User flows or repository areas",
    metricsPossiblyAffected: "Metrics possibly affected",
    suggestedLabels: "Suggested Labels",
    recommendedOwnerOrReviewer: "Recommended Owner / Reviewer",
    suggestedNextAction: "Suggested Next Action",
    suggestedResponseDraft: "Suggested Response Draft",
    notSpecified: "Not specified.",
    noneIdentified: "None identified.",
    emptyItem: "Not specified"
  },
  ja: {
    title: "Maintainer Kit Issue 整理ブリーフ",
    disclaimer: "これはAI生成のIssue整理ブリーフです。対応前に内容を確認してください。",
    issueType: "Issue 種別",
    summary: "要約",
    actionability: "対応可能性",
    missingContext: "不足している文脈",
    impactMap: "影響範囲",
    userFlowsOrRepositoryAreas: "ユーザーフローまたはリポジトリ領域",
    metricsPossiblyAffected: "影響する可能性のある指標",
    suggestedLabels: "推奨ラベル",
    recommendedOwnerOrReviewer: "推奨オーナー / レビュアー",
    suggestedNextAction: "推奨される次のアクション",
    suggestedResponseDraft: "返信ドラフト",
    notSpecified: "未指定です。",
    noneIdentified: "特になし。",
    emptyItem: "未指定"
  }
} satisfies Record<OutputLanguage, Record<string, string>>;

export function renderIssueIntakeBrief(
  brief: IssueIntakeBrief,
  options: RenderIssueIntakeBriefOptions = {}
): string {
  const language = options.language ?? "en";
  const labels = copy[language];

  return `${ISSUE_INTAKE_BRIEF_MARKER}
## ${labels.title}

${labels.disclaimer}

### ${labels.issueType}

${issueTypeLabels[language][brief.issueType]}

### ${labels.summary}

${sanitizeMarkdownText(brief.summary) || labels.notSpecified}

### ${labels.actionability}

${actionabilityLabels[language][brief.actionability]}

### ${labels.missingContext}

${renderBulletList(brief.missingContext, labels.noneIdentified, labels.emptyItem)}

### ${labels.impactMap}

**${labels.userFlowsOrRepositoryAreas}**

${renderBulletList(
  brief.impactMap.userFlowsOrRepositoryAreas,
  labels.noneIdentified,
  labels.emptyItem
)}

**${labels.metricsPossiblyAffected}**

${renderBulletList(brief.impactMap.metricsPossiblyAffected, labels.noneIdentified, labels.emptyItem)}

### ${labels.suggestedLabels}

${renderBulletList(brief.suggestedLabels, labels.noneIdentified, labels.emptyItem)}

### ${labels.recommendedOwnerOrReviewer}

${renderBulletList(
  brief.recommendedOwnerOrReviewer.map((reviewer) => `${reviewer.role}: ${reviewer.reason}`),
  labels.noneIdentified,
  labels.emptyItem
)}

### ${labels.suggestedNextAction}

${sanitizeMarkdownText(brief.suggestedNextAction) || labels.notSpecified}

### ${labels.suggestedResponseDraft}

${renderQuotedDraft(brief.suggestedResponseDraft, labels.notSpecified)}
`;
}
