export interface RepositoryRef {
  owner: string;
  repo: string;
}

export interface ActionContextLike {
  eventName: string;
  payload: any;
  repo: RepositoryRef;
}

export function getEventType(context: ActionContextLike): string {
  const action = typeof context.payload.action === "string" ? context.payload.action : "unknown";
  return `${context.eventName}.${action}`;
}

export function isSupportedIssueEvent(context: ActionContextLike): boolean {
  return context.eventName === "issues" && ["opened", "edited"].includes(context.payload.action);
}

export function isSupportedIssueReproductionEvent(context: ActionContextLike): boolean {
  if (context.eventName === "issues") {
    return context.payload.action === "labeled";
  }

  return context.eventName === "issue_comment" && context.payload.action === "created";
}

export function isSupportedPullRequestEvent(context: ActionContextLike): boolean {
  return (
    context.eventName === "pull_request" &&
    ["opened", "synchronize", "reopened"].includes(context.payload.action)
  );
}

export function getRepository(context: ActionContextLike): RepositoryRef {
  return {
    owner: context.repo.owner,
    repo: context.repo.repo
  };
}
