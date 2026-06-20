import type { PullRequestFile } from "../github/getPullRequestDiff.js";
import { matchGlob } from "../utils/matchGlob.js";

const binaryOrGeneratedPatterns = [
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "*.png",
  "*.jpg",
  "*.jpeg",
  "*.gif",
  "*.webp",
  "*.pdf",
  "*.zip",
  "*.tar",
  "*.tar.gz",
  "*.tgz",
  "*.gz",
  "*.7z",
  "*.mp4",
  "*.mov",
  "*.mp3",
  "*.woff",
  "*.woff2",
  "*.ttf",
  "*.ico",
  "*.lock",
  "*.min.js",
  "*.min.css"
];

export function filterFiles(files: PullRequestFile[], excludePatterns: string[]): PullRequestFile[] {
  return files.filter((file) => !shouldExcludeFile(file.filename, excludePatterns));
}

export function shouldExcludeFile(filename: string, excludePatterns: string[]): boolean {
  return [...excludePatterns, ...binaryOrGeneratedPatterns].some((pattern) => matchGlob(filename, pattern));
}
