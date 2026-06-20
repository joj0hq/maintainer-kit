import type { RepositoryRef } from "./context.js";

export interface ExistingComment {
  id: number;
  body: string;
}

export async function findExistingComment(
  octokit: any,
  repository: RepositoryRef,
  issueNumber: number,
  marker: string
): Promise<ExistingComment | undefined> {
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner: repository.owner,
    repo: repository.repo,
    issue_number: issueNumber,
    per_page: 100
  });

  return comments.find(
    (comment: any) =>
      typeof comment.body === "string" &&
      comment.body.includes(marker) &&
      (comment.user?.type === "Bot" || comment.user?.login === "github-actions[bot]")
  );
}
