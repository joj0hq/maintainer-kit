import { describe, expect, it } from "vitest";
import { getCiFixTrigger } from "../src/agent/ciFixTrigger.js";
import { defaultConfig } from "../src/config/defaultConfig.js";

function enabledConfig() {
  return {
    ...defaultConfig,
    features: {
      ...defaultConfig.features,
      ci_fix_pr: true
    }
  };
}

describe("getCiFixTrigger", () => {
  it("is disabled by default", () => {
    const result = getCiFixTrigger(
      {
        eventName: "issue_comment",
        payload: {
          action: "created",
          issue: { pull_request: {} },
          comment: {
            body: "/maintainer-kit fix-ci",
            author_association: "OWNER"
          }
        },
        repo: { owner: "owner", repo: "repo" }
      },
      defaultConfig
    );

    expect(result.triggered).toBe(false);
  });

  it("requires a pull request target", () => {
    const result = getCiFixTrigger(
      {
        eventName: "issue_comment",
        payload: {
          action: "created",
          issue: {},
          comment: {
            body: "/maintainer-kit fix-ci",
            author_association: "OWNER"
          }
        },
        repo: { owner: "owner", repo: "repo" }
      },
      enabledConfig()
    );

    expect(result.reason).toContain("not a pull request");
  });

  it("rejects untrusted commenters", () => {
    const result = getCiFixTrigger(
      {
        eventName: "issue_comment",
        payload: {
          action: "created",
          issue: { pull_request: {} },
          comment: {
            body: "/maintainer-kit fix-ci",
            author_association: "NONE"
          }
        },
        repo: { owner: "owner", repo: "repo" }
      },
      enabledConfig()
    );

    expect(result.triggered).toBe(false);
    expect(result.reason).toContain("not trusted");
  });

  it("accepts a trusted command on a pull request", () => {
    const result = getCiFixTrigger(
      {
        eventName: "issue_comment",
        payload: {
          action: "created",
          issue: { pull_request: {} },
          comment: {
            body: "/maintainer-kit fix-ci\nfocus on lint",
            author_association: "COLLABORATOR"
          }
        },
        repo: { owner: "owner", repo: "repo" }
      },
      enabledConfig()
    );

    expect(result.triggered).toBe(true);
  });
});
