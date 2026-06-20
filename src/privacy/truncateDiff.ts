import type { PullRequestFile } from "../github/getPullRequestDiff.js";

export interface TruncateDiffOptions {
  maxDiffLines: number;
  maxDiffChars: number;
}

export interface TruncatedDiff {
  files: PullRequestFile[];
  originalLineCount: number;
  retainedLineCount: number;
  originalCharCount: number;
  retainedCharCount: number;
  diffWasTruncated: boolean;
}

export function truncateDiff(files: PullRequestFile[], options: TruncateDiffOptions): TruncatedDiff {
  const originalLineCount = files.reduce((sum, file) => sum + countLines(file.patch), 0);
  const originalCharCount = files.reduce((sum, file) => sum + (file.patch?.length ?? 0), 0);

  let remainingLines = options.maxDiffLines;
  let remainingChars = options.maxDiffChars;
  let retainedLineCount = 0;
  let retainedCharCount = 0;
  let diffWasTruncated = false;

  const truncatedFiles = files.map((file) => {
    if (!file.patch) {
      return file;
    }

    if (remainingLines <= 0 || remainingChars <= 0) {
      diffWasTruncated = true;
      return { ...file, patch: "" };
    }

    const selectedLines: string[] = [];
    for (const line of file.patch.split(/\r?\n/)) {
      const lineWithNewline = selectedLines.length === 0 ? line : `\n${line}`;
      if (remainingLines <= 0 || remainingChars - lineWithNewline.length < 0) {
        diffWasTruncated = true;
        break;
      }

      selectedLines.push(line);
      remainingLines -= 1;
      remainingChars -= lineWithNewline.length;
      retainedLineCount += 1;
      retainedCharCount += lineWithNewline.length;
    }

    const patch = selectedLines.join("\n");
    if (patch.length < file.patch.length) {
      diffWasTruncated = true;
    }

    return { ...file, patch };
  });

  return {
    files: truncatedFiles,
    originalLineCount,
    retainedLineCount,
    originalCharCount,
    retainedCharCount,
    diffWasTruncated
  };
}

function countLines(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  return value.split(/\r?\n/).length;
}
