import { describe, expect, it } from "vitest";
import { defaultConfig } from "../src/config/defaultConfig.js";
import { getIssueReproductionTrigger } from "../src/agent/issueReproductionTrigger.js";

describe("getIssueReproductionTrigger", () => {
  it("is disabled by default", () => {
    const result = getIssueReproductionTrigger(
      {
        eventName: "issues",
        payload: {
          action: "labeled",
          label: { name: "maintainer-kit:repro" },
          issue: {}
        },
        repo: { owner: "owner", repo: "repo" }
      },
      defaultConfig
    );

    expect(result.triggered).toBe(false);
  });

  it("triggers when the configured label is applied", () => {
    const config = {
      ...defaultConfig,
      features: {
        ...defaultConfig.features,
        issue_reproduction_pr: true
      }
    };

    const result = getIssueReproductionTrigger(
      {
        eventName: "issues",
        payload: {
          action: "labeled",
          label: { name: "maintainer-kit:repro" },
          issue: {}
        },
        repo: { owner: "owner", repo: "repo" }
      },
      config
    );

    expect(result).toMatchObject({ triggered: true, source: "label" });
  });

  it("requires trusted author association for comment commands", () => {
    const config = {
      ...defaultConfig,
      features: {
        ...defaultConfig.features,
        issue_reproduction_pr: true
      }
    };

    const result = getIssueReproductionTrigger(
      {
        eventName: "issue_comment",
        payload: {
          action: "created",
          issue: {},
          comment: {
            body: "/maintainer-kit repro",
            author_association: "NONE"
          }
        },
        repo: { owner: "owner", repo: "repo" }
      },
      config
    );

    expect(result.triggered).toBe(false);
    expect(result.reason).toContain("not trusted");
  });

  it("triggers for trusted comment commands", () => {
    const config = {
      ...defaultConfig,
      features: {
        ...defaultConfig.features,
        issue_reproduction_pr: true
      }
    };

    const result = getIssueReproductionTrigger(
      {
        eventName: "issue_comment",
        payload: {
          action: "created",
          issue: {},
          comment: {
            body: "/maintainer-kit repro\nplease add a failing test",
            author_association: "OWNER"
          }
        },
        repo: { owner: "owner", repo: "repo" }
      },
      config
    );

    expect(result).toMatchObject({ triggered: true, source: "comment" });
  });
});
