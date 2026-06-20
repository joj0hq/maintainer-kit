import type { IssueReproductionPrDraft } from "../ai/schemas/issueReproductionPrSchema.js";
import type { OutputLanguage } from "../config/schema.js";
import type { IssueContext } from "../github/getIssueContext.js";
import { renderBulletList, sanitizeMarkdownText } from "./markdown.js";

export const ISSUE_REPRODUCTION_PR_MARKER = "<!-- maintainer-kit:issue-reproduction-pr -->";

export interface RenderIssueReproductionPrBodyOptions {
  draft: IssueReproductionPrDraft;
  issue: IssueContext;
  generatedFiles: string[];
  language?: OutputLanguage;
}

export interface RenderIssueReproductionPrCommentOptions {
  draft: IssueReproductionPrDraft;
  prUrl: string;
  language?: OutputLanguage;
}

const copy = {
  en: {
    titlePrefix: "Add reproduction for issue",
    bodyTitle: "Maintainer Kit Reproduction PR",
    whatThisDoes: "What This PR Does",
    issue: "Issue",
    generatedFiles: "Generated Files",
    evidenceUsed: "Evidence Used",
    validation: "Validation",
    maintainerNotes: "Maintainer Notes",
    notRun: "Maintainer Kit did not run project validation commands in this MVP.",
    noItems: "None provided.",
    commentIntro: "Created a draft reproduction PR:",
    commentNote:
      "This PR is intentionally small and should capture a reproduction or failing regression case, not a full fix."
  },
  ja: {
    titlePrefix: "Issue の再現ケースを追加",
    bodyTitle: "Maintainer Kit 再現 PR",
    whatThisDoes: "この PR が行うこと",
    issue: "Issue",
    generatedFiles: "生成したファイル",
    evidenceUsed: "根拠にした情報",
    validation: "検証",
    maintainerNotes: "メンテナー向けメモ",
    notRun: "この MVP では Maintainer Kit はプロジェクトの検証コマンドを実行していません。",
    noItems: "特になし。",
    commentIntro: "draft の再現 PR を作成しました:",
    commentNote:
      "この PR は意図的に小さく、完全な修正ではなく再現ケースまたは failing regression case を残すためのものです。"
  }
} satisfies Record<OutputLanguage, Record<string, string>>;

export function buildIssueReproductionPrTitle(
  issue: IssueContext,
  language: OutputLanguage
): string {
  const labels = copy[language];
  return `[maintainer-kit] ${labels.titlePrefix} #${issue.number}`;
}

export function renderIssueReproductionPrBody(
  options: RenderIssueReproductionPrBodyOptions
): string {
  const language = options.language ?? "en";
  const labels = copy[language];
  const { draft, issue } = options;

  return `## ${labels.bodyTitle}

### ${labels.whatThisDoes}

${sanitizeMarkdownText(draft.summary) || labels.noItems}

### ${labels.issue}

Related: #${issue.number}

### ${labels.generatedFiles}

${renderBulletList(options.generatedFiles, labels.noItems)}

### ${labels.evidenceUsed}

${renderBulletList(draft.evidenceUsed, labels.noItems)}

### ${labels.validation}

${renderBulletList(draft.validationNotes.length > 0 ? draft.validationNotes : [labels.notRun], labels.noItems)}

### ${labels.maintainerNotes}

${renderBulletList(draft.maintainerNotes, labels.noItems)}
`;
}

export function renderIssueReproductionPrComment(
  options: RenderIssueReproductionPrCommentOptions
): string {
  const language = options.language ?? "en";
  const labels = copy[language];

  return `${ISSUE_REPRODUCTION_PR_MARKER}
${labels.commentIntro} ${options.prUrl}

${labels.commentNote}

${sanitizeMarkdownText(options.draft.summary)}
`;
}
