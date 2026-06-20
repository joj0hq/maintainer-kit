import type { RepositoryRef } from "./context.js";

export interface PullRequestFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export async function getPullRequestDiff(
  octokit: any,
  repository: RepositoryRef,
  pullNumber: number
): Promise<PullRequestFile[]> {
  const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner: repository.owner,
    repo: repository.repo,
    pull_number: pullNumber,
    per_page: 100
  });

  return files.map((file: any) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions ?? 0,
    deletions: file.deletions ?? 0,
    changes: file.changes ?? 0,
    patch: file.patch
  }));
}

