import type { CiFailureContext } from "../agent/ciFailureContext.js";
import type { CiFixPrDraft } from "../ai/schemas/ciFixPrSchema.js";
import type { OutputLanguage } from "../config/schema.js";
import { renderBulletList, sanitizeMarkdownText } from "./markdown.js";

export const CI_FIX_PR_MARKER = "<!-- maintainer-kit:ci-fix-pr -->";

const copy = {
  en: {
    titlePrefix: "Fix CI for PR",
    bodyTitle: "Maintainer Kit CI Fix",
    summary: "What This PR Changes",
    target: "Target Pull Request",
    failure: "Observed Failure",
    analysis: "Failure Analysis",
    files: "Generated Files",
    validation: "Validation",
    notes: "Maintainer Notes",
    noItems: "None provided.",
    validationWarning:
      "Maintainer Kit did not execute repository code in the privileged repair job. Normal CI on this draft PR is the validation source.",
    commentIntro: "Created a focused draft PR for the CI failure:",
    commentNote:
      "Merge the draft PR into the original PR branch only after its normal CI and human review pass."
  },
  ja: {
    titlePrefix: "PRのCIを修正",
    bodyTitle: "Maintainer Kit CI 修正",
    summary: "この PR が変更すること",
    target: "対象 Pull Request",
    failure: "検出した失敗",
    analysis: "失敗の分析",
    files: "生成したファイル",
    validation: "検証",
    notes: "メンテナー向けメモ",
    noItems: "特になし。",
    validationWarning:
      "権限を持つ修正job内ではrepository codeを実行していません。このdraft PRで動く通常CIを検証結果として扱ってください。",
    commentIntro: "CI failureに対する小さなdraft PRを作成しました:",
    commentNote: "通常CIとhuman reviewが通った後に、このdraft PRを元PRのbranchへmergeしてください。"
  }
} satisfies Record<OutputLanguage, Record<string, string>>;

export function buildCiFixPrTitle(pullRequestNumber: number, language: OutputLanguage): string {
  return `[maintainer-kit] ${copy[language].titlePrefix} #${pullRequestNumber}`;
}

export function renderCiFixPrBody(options: {
  draft: CiFixPrDraft;
  failure: CiFailureContext;
  generatedFiles: string[];
  language?: OutputLanguage;
}): string {
  const language = options.language ?? "en";
  const labels = copy[language];
  const failedJobs = options.failure.failedJobs.map(
    (job) => `${job.name}: ${job.conclusion} (${job.htmlUrl})`
  );

  return `## ${labels.bodyTitle}

### ${labels.summary}

${sanitizeMarkdownText(options.draft.summary) || labels.noItems}

### ${labels.target}

- Original PR: #${options.failure.pullRequest.number}
- Target branch: \`${options.failure.pullRequest.headRef}\`
- Failed run: ${options.failure.run.htmlUrl}

### ${labels.failure}

${renderBulletList(failedJobs, labels.noItems)}

### ${labels.analysis}

${renderBulletList(options.draft.failureAnalysis, labels.noItems)}

### ${labels.files}

${renderBulletList(options.generatedFiles, labels.noItems)}

### ${labels.validation}

- ${labels.validationWarning}
${renderBulletList(options.draft.validationNotes, labels.noItems)}

### ${labels.notes}

${renderBulletList(options.draft.maintainerNotes, labels.noItems)}
`;
}

export function renderCiFixPrComment(options: {
  draft: CiFixPrDraft;
  prUrl: string;
  language?: OutputLanguage;
}): string {
  const language = options.language ?? "en";
  const labels = copy[language];

  return `${CI_FIX_PR_MARKER}
${labels.commentIntro} ${options.prUrl}

${labels.commentNote}

${sanitizeMarkdownText(options.draft.summary)}
`;
}
