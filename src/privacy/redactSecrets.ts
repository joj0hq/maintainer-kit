import type { PullRequestFile } from "../github/getPullRequestDiff.js";

const REDACTION = "[REDACTED_SECRET]";

const secretPatterns: RegExp[] = [
  /gh[pousr]_[A-Za-z0-9_]{30,}/g,
  /github_pat_[A-Za-z0-9_]{30,}/g,
  /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/gi,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s"'`]+/gi
];

const envAssignmentPattern =
  /\b([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|APIKEY|PRIVATE_KEY|DATABASE_URL|DSN)[A-Z0-9_]*)\s*=\s*("[^"]+"|'[^']+'|[^\s"'`]+)/gi;

const highEntropyPattern = /\b[A-Za-z0-9_+/=-]{48,}\b/g;

export function redactSecrets(value: string): string {
  let redacted = value;

  for (const pattern of secretPatterns) {
    redacted = redacted.replace(pattern, REDACTION);
  }

  redacted = redacted.replace(envAssignmentPattern, (_match, key: string) => `${key}=${REDACTION}`);
  redacted = redacted.replace(highEntropyPattern, (candidate) =>
    looksHighEntropy(candidate) ? REDACTION : candidate
  );

  return redacted;
}

export function redactSecretsInFiles(files: PullRequestFile[]): PullRequestFile[] {
  return files.map((file) => ({
    ...file,
    patch: file.patch ? redactSecrets(file.patch) : file.patch
  }));
}

function looksHighEntropy(candidate: string): boolean {
  const hasUpper = /[A-Z]/.test(candidate);
  const hasLower = /[a-z]/.test(candidate);
  const hasDigit = /\d/.test(candidate);
  const hasSymbol = /[_+/=-]/.test(candidate);
  return [hasUpper, hasLower, hasDigit, hasSymbol].filter(Boolean).length >= 3;
}

