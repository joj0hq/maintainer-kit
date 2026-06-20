import { describe, expect, it } from "vitest";
import { redactSecrets, redactSecretsInFiles } from "../src/privacy/redactSecrets.js";

describe("redactSecrets", () => {
  it("redacts common secret formats", () => {
    const openAiKey = ["sk", "proj", "abcdefghijklmnopqrstuvwxyz123456"].join("-");
    const bearerToken = "abcdefghijklmnopqrstuvwxyz1234567890";
    const databaseUrl = "postgres://" + "user:pass@example.com/db";
    const awsAccessKey = "AK" + "IA1234567890ABCDEF";

    const value = [
      `OPENAI_API_KEY=${openAiKey}`,
      `Authorization: Bearer ${bearerToken}`,
      `DATABASE_URL=${databaseUrl}`,
      `AWS_ACCESS_KEY_ID=${awsAccessKey}`
    ].join("\n");

    const redacted = redactSecrets(value);

    expect(redacted).not.toContain(openAiKey);
    expect(redacted).not.toContain(bearerToken);
    expect(redacted).not.toContain(databaseUrl);
    expect(redacted).not.toContain(awsAccessKey);
    expect(redacted).toContain("[REDACTED_SECRET]");
  });

  it("redacts patches in file arrays", () => {
    const githubToken = ["gh", "p_", "abcdefghijklmnopqrstuvwxyz1234567890"].join("");

    const [file] = redactSecretsInFiles([
      {
        filename: ".env",
        status: "modified",
        additions: 1,
        deletions: 0,
        changes: 1,
        patch: `+TOKEN=${githubToken}`
      }
    ]);

    expect(file?.patch).toBe("+TOKEN=[REDACTED_SECRET]");
  });
});
