import { z } from "zod";

export const issueReproductionPrSchema = z
  .object({
    shouldCreatePr: z.boolean(),
    skipReason: z.string(),
    title: z.string(),
    summary: z.string(),
    evidenceUsed: z.array(z.string()),
    files: z.array(
      z
        .object({
          path: z.string(),
          content: z.string(),
          purpose: z.string()
        })
        .strict()
    ),
    validationNotes: z.array(z.string()),
    maintainerNotes: z.array(z.string()),
    confidence: z.enum(["low", "medium", "high"])
  })
  .strict();

export type IssueReproductionPrDraft = z.infer<typeof issueReproductionPrSchema>;
