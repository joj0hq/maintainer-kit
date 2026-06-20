import { z } from "zod";

export const issueIntakeBriefSchema = z
  .object({
    issueType: z.enum([
      "bug",
      "feature_request",
      "question",
      "documentation",
      "maintenance",
      "unknown"
    ]),
    summary: z.string(),
    actionability: z.enum(["low", "medium", "high"]),
    missingContext: z.array(z.string()),
    impactMap: z
      .object({
        userFlowsOrRepositoryAreas: z.array(z.string()),
        metricsPossiblyAffected: z.array(z.string())
      })
      .strict(),
    suggestedLabels: z.array(z.string()),
    recommendedOwnerOrReviewer: z.array(
      z
        .object({
          role: z.string(),
          reason: z.string()
        })
        .strict()
    ),
    suggestedNextAction: z.string(),
    suggestedResponseDraft: z.string(),
    confidence: z.enum(["low", "medium", "high"])
  })
  .strict();

export type IssueIntakeBrief = z.infer<typeof issueIntakeBriefSchema>;

