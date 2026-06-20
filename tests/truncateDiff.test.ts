import { describe, expect, it } from "vitest";
import { truncateDiff } from "../src/privacy/truncateDiff.js";

describe("truncateDiff", () => {
  it("limits diff by total lines", () => {
    const result = truncateDiff(
      [
        {
          filename: "src/a.ts",
          status: "modified",
          additions: 4,
          deletions: 0,
          changes: 4,
          patch: ["line1", "line2", "line3", "line4"].join("\n")
        }
      ],
      { maxDiffLines: 2, maxDiffChars: 1000 }
    );

    expect(result.diffWasTruncated).toBe(true);
    expect(result.originalLineCount).toBe(4);
    expect(result.retainedLineCount).toBe(2);
    expect(result.files[0]?.patch).toBe("line1\nline2");
  });

  it("limits diff by total characters", () => {
    const result = truncateDiff(
      [
        {
          filename: "src/a.ts",
          status: "modified",
          additions: 2,
          deletions: 0,
          changes: 2,
          patch: "abcdef\nxyz"
        }
      ],
      { maxDiffLines: 100, maxDiffChars: 6 }
    );

    expect(result.diffWasTruncated).toBe(true);
    expect(result.files[0]?.patch).toBe("abcdef");
  });
});

