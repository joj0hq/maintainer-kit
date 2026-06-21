import { describe, expect, it } from "vitest";
import {
  sanitizeCiJobLog,
  selectFailedWorkflowRun,
  truncateCiLog
} from "../src/agent/ciFailureContext.js";

describe("selectFailedWorkflowRun", () => {
  it("selects the latest failed run for the pull request", () => {
    const result = selectFailedWorkflowRun(
      [
        {
          id: 1,
          conclusion: "failure",
          head_sha: "old",
          updated_at: "2026-06-20T00:00:00Z",
          pull_requests: [{ number: 42 }]
        },
        {
          id: 2,
          conclusion: "failure",
          head_sha: "head",
          updated_at: "2026-06-21T00:00:00Z",
          pull_requests: [{ number: 42 }]
        }
      ],
      42,
      "head"
    );

    expect(result?.id).toBe(2);
  });

  it("falls back to the head SHA when pull request metadata is absent", () => {
    const result = selectFailedWorkflowRun(
      [
        {
          id: 7,
          conclusion: "timed_out",
          head_sha: "head",
          updated_at: "2026-06-21T00:00:00Z",
          pull_requests: []
        }
      ],
      42,
      "head"
    );

    expect(result?.id).toBe(7);
  });

  it("does not select an older failure when the latest run passed", () => {
    const result = selectFailedWorkflowRun(
      [
        {
          id: 8,
          workflow_id: 100,
          conclusion: "failure",
          head_sha: "head",
          updated_at: "2026-06-20T00:00:00Z",
          pull_requests: [{ number: 42 }]
        },
        {
          id: 9,
          workflow_id: 100,
          conclusion: "success",
          head_sha: "head",
          updated_at: "2026-06-21T00:00:00Z",
          pull_requests: [{ number: 42 }]
        }
      ],
      42,
      "head"
    );

    expect(result).toBeUndefined();
  });

  it("keeps failures from another workflow when a newer workflow passed", () => {
    const result = selectFailedWorkflowRun(
      [
        {
          id: 10,
          workflow_id: 100,
          conclusion: "failure",
          head_sha: "head",
          updated_at: "2026-06-21T00:00:00Z",
          pull_requests: [{ number: 42 }]
        },
        {
          id: 11,
          workflow_id: 200,
          conclusion: "success",
          head_sha: "head",
          updated_at: "2026-06-21T01:00:00Z",
          pull_requests: [{ number: 42 }]
        }
      ],
      42,
      "head"
    );

    expect(result?.id).toBe(10);
  });

  it("redacts secrets and removes ANSI color codes from logs", () => {
    const token = `ghp_${"a".repeat(36)}`;
    const result = sanitizeCiJobLog(`\u001b[31mGITHUB_TOKEN=${token}\u001b[0m\r\nfailed`);

    expect(result).not.toContain(token);
    expect(result).not.toContain("\u001b");
    expect(result).toContain("[REDACTED_SECRET]");
  });

  it("keeps the start and end of oversized logs", () => {
    const result = truncateCiLog(`${"a".repeat(100)}tail`, 40);

    expect(result.truncated).toBe(true);
    expect(result.value).toContain("CI log truncated");
    expect(result.value).toContain("tail");
  });
});
