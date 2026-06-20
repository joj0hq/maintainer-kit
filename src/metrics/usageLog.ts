import type { PublishResult } from "../github/publishComment.js";
import type { Logger } from "../utils/logger.js";

export interface UsageLog {
  eventType: string;
  feature: string;
  changedFiles?: number;
  analyzedFiles?: number;
  diffLinesBeforeTruncation?: number;
  diffLinesAfterTruncation?: number;
  diffWasTruncated?: boolean;
  commentResult: PublishResult | "skipped";
  durationMs: number;
}

export function logUsage(logger: Logger, usage: UsageLog): void {
  logger.info(
    JSON.stringify({
      maintainerKit: {
        eventType: usage.eventType,
        feature: usage.feature,
        changedFiles: usage.changedFiles,
        analyzedFiles: usage.analyzedFiles,
        diffLinesBeforeTruncation: usage.diffLinesBeforeTruncation,
        diffLinesAfterTruncation: usage.diffLinesAfterTruncation,
        diffWasTruncated: usage.diffWasTruncated,
        commentResult: usage.commentResult,
        durationMs: usage.durationMs
      }
    })
  );
}

