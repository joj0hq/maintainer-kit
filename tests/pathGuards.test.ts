import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  isPathAllowed,
  normalizeRepositoryPath,
  validateGeneratedFiles
} from "../src/agent/pathGuards.js";

describe("pathGuards", () => {
  it("normalizes safe repository paths", () => {
    expect(normalizeRepositoryPath("./tests/repro.test.ts")).toBe("tests/repro.test.ts");
    expect(normalizeRepositoryPath("tests\\repro.test.ts")).toBe("tests/repro.test.ts");
  });

  it("rejects unsafe repository paths", () => {
    expect(() => normalizeRepositoryPath("../secret.txt")).toThrow("Invalid repository path");
    expect(() => normalizeRepositoryPath("/tmp/secret.txt")).toThrow("Invalid repository path");
    expect(() => normalizeRepositoryPath("tests//repro.test.ts")).toThrow(
      "Invalid repository path"
    );
  });

  it("enforces allowed and blocked path patterns", () => {
    expect(isPathAllowed("tests/repro.test.ts", ["tests/**"], [".github/**"])).toBe(true);
    expect(isPathAllowed(".github/workflows/test.yml", ["**"], [".github/**"])).toBe(false);
  });

  it("validates generated files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "maintainer-kit-guards-"));

    const files = validateGeneratedFiles(
      [
        {
          path: "tests/issue-123.test.ts",
          content: "test('repro', () => {})\n",
          purpose: "reproduction test"
        }
      ],
      {
        allowedPaths: ["tests/**"],
        blockedPaths: [".github/**"],
        maxFilesChanged: 1,
        maxFileBytes: 100,
        maxTotalBytes: 100,
        root: dir
      }
    );

    expect(files[0]?.path).toBe("tests/issue-123.test.ts");
  });

  it("rejects existing files by default", async () => {
    const dir = await mkdtemp(join(tmpdir(), "maintainer-kit-guards-"));
    await writeFile(join(dir, "existing.test.ts"), "already here\n");

    expect(() =>
      validateGeneratedFiles(
        [
          {
            path: "existing.test.ts",
            content: "new content\n",
            purpose: "overwrite"
          }
        ],
        {
          allowedPaths: ["*.test.ts"],
          blockedPaths: [],
          maxFilesChanged: 1,
          maxFileBytes: 100,
          maxTotalBytes: 100,
          root: dir
        }
      )
    ).toThrow("overwrite an existing file");
  });
});
