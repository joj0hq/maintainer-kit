import { describe, expect, it } from "vitest";
import { matchGlob } from "../src/utils/matchGlob.js";

describe("matchGlob", () => {
  describe("patterns without wildcards", () => {
    it("matches an exact path", () => {
      expect(matchGlob("src/index.ts", "src/index.ts")).toBe(true);
    });

    it("matches when the pattern is a trailing path segment", () => {
      expect(matchGlob("src/utils/matchGlob.ts", "matchGlob.ts")).toBe(true);
      expect(matchGlob("a/b/node_modules", "node_modules")).toBe(true);
    });

    it("does not match an unrelated path", () => {
      expect(matchGlob("src/index.ts", "src/main.ts")).toBe(false);
    });

    it("does not partially match a longer pattern", () => {
      expect(matchGlob("README.md", "docs/README.md")).toBe(false);
    });

    it("does not match on a partial segment", () => {
      // "index.ts" ends with "ndex.ts" textually but not on a path boundary.
      expect(matchGlob("src/index.ts", "ndex.ts")).toBe(false);
    });
  });

  describe("patterns with wildcards", () => {
    it("matches an extension wildcard anywhere in the tree", () => {
      expect(matchGlob("src/foo.ts", "*.ts")).toBe(true);
      expect(matchGlob("foo.ts", "*.ts")).toBe(true);
    });

    it("does not match a different extension", () => {
      expect(matchGlob("src/foo.js", "*.ts")).toBe(false);
    });

    it("lets a wildcard span nested directories", () => {
      expect(matchGlob("src/deep/nested/foo.ts", "src/*.ts")).toBe(true);
    });

    it("treats the dot in a pattern literally", () => {
      // The "." must be escaped, so it should not match an arbitrary character.
      expect(matchGlob("srcXfoo.ts", "src.ts")).toBe(false);
    });
  });

  describe("path normalization", () => {
    it("normalizes backslash separators before matching", () => {
      expect(matchGlob("src\\utils\\matchGlob.ts", "*.ts")).toBe(true);
      expect(matchGlob("src\\utils\\matchGlob.ts", "src/*.ts")).toBe(true);
    });
  });
});
