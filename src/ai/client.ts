import OpenAI from "openai";
import type { z } from "zod";
import type { PromptMessages } from "./prompts/types.js";

export const DEFAULT_MODEL = "gpt-4.1-mini";

export interface GenerateStructuredJsonOptions<T> {
  apiKey: string;
  model?: string;
  prompt: PromptMessages;
  schema: z.ZodSchema<T>;
}

export async function generateStructuredJson<T>(
  options: GenerateStructuredJsonOptions<T>
): Promise<T> {
  const client = new OpenAI({ apiKey: options.apiKey });
  const model = options.model?.trim() || DEFAULT_MODEL;

  const response = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: options.prompt.system },
      { role: "user", content: options.prompt.user }
    ]
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`OpenAI returned invalid JSON: ${formatUnknownError(error)}`);
  }

  const result = options.schema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path.join(".") || "response";
    const message = first?.message || "unknown validation error";
    throw new Error(`OpenAI response did not match expected schema: ${path} ${message}`);
  }

  return result.data;
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
