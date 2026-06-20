import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface CommitAndPushOptions {
  branchName: string;
  files: string[];
  commitMessage: string;
}

export async function ensureCleanWorkingTree(): Promise<void> {
  const result = await runGit(["status", "--porcelain"]);
  if (result.stdout.trim()) {
    throw new Error("Working tree is not clean. Refusing to create an issue reproduction PR.");
  }
}

export async function commitAndPushDraftBranch(options: CommitAndPushOptions): Promise<void> {
  await runGit(["config", "user.name", "github-actions[bot]"]);
  await runGit(["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);
  await runGit(["checkout", "-b", options.branchName]);
  await runGit(["add", "--", ...options.files]);
  await runGit(["diff", "--cached", "--check"]);
  await runGit(["commit", "-m", options.commitMessage]);
  await runGit(["push", "origin", `HEAD:${options.branchName}`]);
}

async function runGit(args: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execFileAsync("git", args, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 10
    });
  } catch (error) {
    if (isExecError(error)) {
      throw new Error(`git ${args.join(" ")} failed: ${error.stderr || error.message}`);
    }
    throw error;
  }
}

function isExecError(error: unknown): error is Error & { stderr?: string } {
  return error instanceof Error;
}
