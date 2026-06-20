import { z } from "zod";

const stringArraySchema = z.array(z.string()).default([]);

const projectTypeSchema = z.union([z.literal("oss"), z.literal("product")], {
  errorMap: () => ({ message: 'must be either "oss" or "product"' })
});

export const maintainerKitConfigSchema = z.object({
  project: z
    .object({
      name: z.string(),
      type: projectTypeSchema,
      domain: z.string(),
      platforms: stringArraySchema
    })
    .strict(),
  features: z
    .object({
      issue_intake_brief: z.boolean(),
      pr_decision_brief: z.boolean(),
      release_readiness_brief: z.boolean()
    })
    .strict(),
  behavior: z
    .object({
      comment_mode: z.enum(["create", "update", "none"]),
      auto_label: z.boolean(),
      auto_close: z.boolean(),
      dry_run: z.boolean()
    })
    .strict(),
  model: z
    .object({
      provider: z.literal("openai"),
      name: z.string(),
      max_input_tokens: z.number().int().positive()
    })
    .strict(),
  metrics: z
    .object({
      primary: stringArraySchema,
      secondary: stringArraySchema
    })
    .strict(),
  critical_flows: stringArraySchema,
  sensitive_areas: stringArraySchema,
  roles: z
    .record(
      z.object({
        required_for: stringArraySchema
      })
    )
    .default({}),
  privacy: z
    .object({
      max_diff_lines: z.number().int().positive(),
      max_diff_chars: z.number().int().positive(),
      redact_secrets: z.boolean(),
      exclude_files: stringArraySchema
    })
    .strict()
});

export type MaintainerKitConfig = z.infer<typeof maintainerKitConfigSchema>;
export type CommentMode = MaintainerKitConfig["behavior"]["comment_mode"];

export type ExecutionMode = "suggest" | "dry-run";

