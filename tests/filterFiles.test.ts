import { describe, expect, it } from "vitest";
import { filterFiles, shouldExcludeFile } from "../src/privacy/filterFiles.js";

describe("filterFiles", () => {
  it("excludes configured patterns and generated/binary defaults", () => {
    const files = [
      file("src/index.ts"),
      file("package-lock.json"),
      file("assets/logo.png"),
      file("dist/app.min.js"),
      file("docs/spec.md")
    ];

    expect(filterFiles(files, ["docs/*.md"]).map((item) => item.filename)).toEqual(["src/index.ts"]);
  });

  it("matches basename patterns against nested paths", () => {
    expect(shouldExcludeFile("packages/web/pnpm-lock.yaml", ["pnpm-lock.yaml"])).toBe(true);
  });
});

function file(filename: string) {
  return {
    filename,
    status: "modified",
    additions: 1,
    deletions: 0,
    changes: 1,
    patch: "@@ -1 +1 @@\n-test\n+test"
  };
}

