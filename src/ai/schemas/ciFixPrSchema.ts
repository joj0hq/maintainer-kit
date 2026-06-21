import { z } from "zod";

export const ciFixPrSchema = z
  .object({
    shouldCreatePr: z.boolean(),
    skipReason: z.string(),
    title: z.string(),
    summary: z.string(),
    failureAnalysis: z.array(z.string()),
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

export type CiFixPrDraft = z.infer<typeof ciFixPrSchema>;
