import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { defaultConfig } from "../src/config/defaultConfig.js";
import { deepMerge, loadConfig } from "../src/config/loadConfig.js";

describe("loadConfig", () => {
  it("uses safe defaults when the config file is missing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "maintainer-kit-"));
    const config = await loadConfig(join(dir, ".maintainer-kit.yml"));

    expect(config).toEqual(defaultConfig);
  });

  it("deep merges user config with defaults", () => {
    const merged = deepMerge(defaultConfig as unknown as Record<string, unknown>, {
      project: {
        name: "Example"
      },
      privacy: {
        max_diff_lines: 10
      }
    });

    expect((merged.project as any).name).toBe("Example");
    expect((merged.project as any).type).toBe("oss");
    expect((merged.privacy as any).max_diff_lines).toBe(10);
    expect((merged.privacy as any).redact_secrets).toBe(true);
  });

  it("reports invalid project types clearly", async () => {
    const dir = await mkdtemp(join(tmpdir(), "maintainer-kit-"));
    const path = join(dir, ".maintainer-kit.yml");
    await writeFile(
      path,
      [
        "project:",
        "  name: Example",
        "  type: invalid",
        "  domain: tooling",
        "  platforms: []"
      ].join("\n")
    );

    await expect(loadConfig(path)).rejects.toThrow(
      'project.type must be either "oss" or "product"'
    );
  });
});
