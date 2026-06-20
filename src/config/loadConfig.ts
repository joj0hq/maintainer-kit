import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { ZodError } from "zod";
import { defaultConfig } from "./defaultConfig.js";
import { maintainerKitConfigSchema, type MaintainerKitConfig } from "./schema.js";
import { ConfigError } from "../utils/errors.js";

type JsonObject = Record<string, unknown>;

export async function loadConfig(configPath: string): Promise<MaintainerKitConfig> {
  const resolvedPath = resolve(configPath);

  if (!existsSync(resolvedPath)) {
    return defaultConfig;
  }

  let parsed: unknown;
  try {
    const source = await readFile(resolvedPath, "utf8");
    parsed = parseYaml(source) ?? {};
  } catch (error) {
    throw new ConfigError(`Invalid ${configPath}: ${formatUnknownError(error)}`);
  }

  try {
    if (!isPlainObject(parsed)) {
      throw new ConfigError(`Invalid ${configPath}: top-level config must be a YAML object`);
    }
    const merged = deepMerge(defaultConfig as unknown as JsonObject, parsed as JsonObject);
    return maintainerKitConfigSchema.parse(merged);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ConfigError(`Invalid ${configPath}: ${formatZodError(error)}`);
    }
    throw error;
  }
}

export function deepMerge(base: JsonObject, override: JsonObject): JsonObject {
  const output: JsonObject = { ...base };

  for (const [key, value] of Object.entries(override ?? {})) {
    const baseValue = output[key];
    if (isPlainObject(baseValue) && isPlainObject(value)) {
      output[key] = deepMerge(baseValue, value);
      continue;
    }
    output[key] = value;
  }

  return output;
}

function isPlainObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatZodError(error: ZodError): string {
  const first = error.issues[0];
  if (!first) {
    return "unknown validation error";
  }

  const path = first.path.join(".");
  return path ? `${path} ${first.message}` : first.message;
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
