import { Buffer } from "node:buffer";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { matchGlob } from "../utils/matchGlob.js";

export interface GeneratedFile {
  path: string;
  content: string;
  purpose: string;
}

export interface FileGuardOptions {
  allowedPaths: string[];
  blockedPaths: string[];
  maxFilesChanged: number;
  maxFileBytes: number;
  maxTotalBytes: number;
  allowExistingFiles?: boolean;
  root?: string;
}

export function validateGeneratedFiles(
  files: GeneratedFile[],
  options: FileGuardOptions
): GeneratedFile[] {
  if (files.length === 0) {
    throw new Error("Issue reproduction PR generation returned no files.");
  }

  if (files.length > options.maxFilesChanged) {
    throw new Error(
      `Issue reproduction PR attempted to change ${files.length} files, but max_files_changed is ${options.maxFilesChanged}.`
    );
  }

  const seenPaths = new Set<string>();
  let totalBytes = 0;

  return files.map((file) => {
    const path = normalizeRepositoryPath(file.path);

    if (seenPaths.has(path)) {
      throw new Error(`Issue reproduction PR returned duplicate file path: ${path}`);
    }
    seenPaths.add(path);

    if (!isPathAllowed(path, options.allowedPaths, options.blockedPaths)) {
      throw new Error(`Issue reproduction PR attempted to write outside allowed paths: ${path}`);
    }

    if (!options.allowExistingFiles && existsSync(join(options.root ?? cwd(), path))) {
      throw new Error(`Issue reproduction PR attempted to overwrite an existing file: ${path}`);
    }

    const fileBytes = Buffer.byteLength(file.content, "utf8");
    if (fileBytes > options.maxFileBytes) {
      throw new Error(
        `Issue reproduction PR generated ${path} with ${fileBytes} bytes, but max_file_bytes is ${options.maxFileBytes}.`
      );
    }

    totalBytes += fileBytes;
    if (totalBytes > options.maxTotalBytes) {
      throw new Error(
        `Issue reproduction PR generated ${totalBytes} bytes, but max_total_bytes is ${options.maxTotalBytes}.`
      );
    }

    return {
      ...file,
      path
    };
  });
}

export function isPathAllowed(
  path: string,
  allowedPaths: string[],
  blockedPaths: string[]
): boolean {
  const normalizedPath = normalizeRepositoryPath(path);

  if (blockedPaths.some((pattern) => matchGlob(normalizedPath, pattern))) {
    return false;
  }

  return allowedPaths.some((pattern) => matchGlob(normalizedPath, pattern));
}

export function normalizeRepositoryPath(path: string): string {
  const normalized = path.replaceAll("\\", "/").replace(/^\.\//, "");

  if (!normalized || normalized.startsWith("/") || normalized.includes("\0")) {
    throw new Error(`Invalid repository path: ${path}`);
  }

  const segments = normalized.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error(`Invalid repository path: ${path}`);
  }

  return normalized;
}
