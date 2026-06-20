import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { cwd } from "node:process";
import type { MaintainerKitConfig } from "../config/schema.js";
import { matchGlob } from "../utils/matchGlob.js";
import { normalizeRepositoryPath } from "./pathGuards.js";

export interface RepositoryContextFile {
  path: string;
  content: string;
}

export interface RepositoryContextSnapshot {
  fileIndex: string[];
  files: RepositoryContextFile[];
}

const skippedDirectories = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  ".cache"
]);

const skippedExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".pdf",
  ".zip",
  ".gz",
  ".tar",
  ".mov",
  ".mp4"
]);

export async function collectRepositoryContext(
  config: MaintainerKitConfig,
  root = cwd()
): Promise<RepositoryContextSnapshot> {
  const agentConfig = config.agent.issue_reproduction_pr;
  const allFiles = await listRepositoryFiles(root);
  const fileIndex = allFiles
    .filter((path) => !isExcluded(path, config.privacy.exclude_files))
    .filter((path) => !isBlocked(path, agentConfig.blocked_paths))
    .filter((path) => isAllowedContext(path, agentConfig.context_paths));

  const files: RepositoryContextFile[] = [];
  let totalChars = 0;

  for (const path of fileIndex) {
    if (files.length >= agentConfig.max_context_files) {
      break;
    }

    const absolutePath = join(root, path);
    const fileStat = await stat(absolutePath);
    if (fileStat.size > agentConfig.max_file_bytes) {
      continue;
    }

    const content = await readFile(absolutePath, "utf8");
    const nextTotalChars = totalChars + content.length;
    if (nextTotalChars > agentConfig.max_context_chars) {
      break;
    }

    files.push({ path, content });
    totalChars = nextTotalChars;
  }

  return {
    fileIndex,
    files
  };
}

async function listRepositoryFiles(root: string): Promise<string[]> {
  const output: string[] = [];

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!skippedDirectories.has(entry.name)) {
          await visit(join(directory, entry.name));
        }
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const path = normalizeRepositoryPath(relative(root, join(directory, entry.name)));
      if (isLikelyBinary(path)) {
        continue;
      }
      output.push(path);
    }
  }

  await visit(root);
  return output.sort();
}

function isAllowedContext(path: string, contextPaths: string[]): boolean {
  return contextPaths.some((pattern) => matchGlob(path, pattern));
}

function isBlocked(path: string, blockedPaths: string[]): boolean {
  return blockedPaths.some((pattern) => matchGlob(path, pattern));
}

function isExcluded(path: string, excludeFiles: string[]): boolean {
  return excludeFiles.some((pattern) => matchGlob(path, pattern));
}

function isLikelyBinary(path: string): boolean {
  const lowerPath = path.toLowerCase();
  return [...skippedExtensions].some((extension) => lowerPath.endsWith(extension));
}
