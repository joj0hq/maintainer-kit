export function sanitizeMarkdownText(value: string): string {
  return value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

export function sanitizeListItem(value: string, emptyText = "Not specified"): string {
  const sanitized = sanitizeMarkdownText(value)
    .replace(/\n+/g, " ")
    .replace(/^\s*[-*]\s+/g, "")
    .replace(/^\s*\[[ xX]\]\s+/g, "")
    .trim();

  return sanitized || emptyText;
}

export function renderBulletList(
  items: string[],
  emptyText = "None identified.",
  emptyItemText = "Not specified"
): string {
  const normalized = items.map((item) => sanitizeListItem(item, emptyItemText)).filter(Boolean);
  if (normalized.length === 0) {
    return `- ${emptyText}`;
  }

  return normalized.map((item) => `- ${item}`).join("\n");
}

export function renderChecklist(
  items: string[],
  emptyText = "Add a targeted verification case.",
  emptyItemText = "Not specified"
): string {
  const normalized = items.map((item) => sanitizeListItem(item, emptyItemText)).filter(Boolean);
  if (normalized.length === 0) {
    return `- [ ] ${emptyText}`;
  }

  return normalized.map((item) => `- [ ] ${item}`).join("\n");
}

export function renderQuotedDraft(value: string, emptyText = "Not specified."): string {
  const sanitized = sanitizeMarkdownText(value);
  if (!sanitized) {
    return `> ${emptyText}`;
  }

  return sanitized
    .split("\n")
    .map((line) => `> ${line.trim()}`)
    .join("\n");
}
