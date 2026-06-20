import type { MaintainerKitConfig } from "./schema.js";

export const defaultConfig: MaintainerKitConfig = {
  project: {
    name: "unknown",
    type: "oss",
    domain: "unknown",
    platforms: []
  },
  features: {
    issue_intake_brief: true,
    pr_decision_brief: true,
    release_readiness_brief: false
  },
  behavior: {
    comment_mode: "update",
    auto_label: false,
    auto_close: false,
    dry_run: false
  },
  model: {
    provider: "openai",
    name: "",
    max_input_tokens: 12000
  },
  metrics: {
    primary: [],
    secondary: []
  },
  critical_flows: [],
  sensitive_areas: [],
  roles: {},
  privacy: {
    max_diff_lines: 800,
    max_diff_chars: 50000,
    redact_secrets: true,
    exclude_files: [
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock",
      "*.min.js",
      "*.png",
      "*.jpg",
      "*.jpeg",
      "*.gif",
      "*.webp",
      "*.pdf",
      "*.zip"
    ]
  }
};

