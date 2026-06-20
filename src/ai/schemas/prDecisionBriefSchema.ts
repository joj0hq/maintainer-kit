import { z } from "zod";

export const prDecisionBriefSchema = z
  .object({
    summary: z.string(),
    decisionNeeded: z.string(),
    impactMap: z
      .object({
        userFlows: z.array(z.string()),
        productOrRepositoryAreas: z.array(z.string()),
        metricsPossiblyAffected: z.array(z.string()),
        technicalAreas: z.array(z.string())
      })
      .strict(),
    missingContext: z.array(z.string()),
    recommendedReviewers: z.array(
      z
        .object({
          role: z.string(),
          reason: z.string()
        })
        .strict()
    ),
    qaChecklist: z.array(z.string()),
    suggestedNextAction: z.string(),
    suggestedResponseDraft: z.string(),
    confidence: z.enum(["low", "medium", "high"])
  })
  .strict();

export type PrDecisionBrief = z.infer<typeof prDecisionBriefSchema>;

