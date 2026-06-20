export function matchGlob(path: string, pattern: string): boolean {
  if (!pattern.includes("*")) {
    return normalizePath(path) === normalizePath(pattern) || normalizePath(path).endsWith(`/${pattern}`);
  }

  const regex = globToRegExp(pattern);
  return regex.test(normalizePath(path));
}

function globToRegExp(pattern: string): RegExp {
  const escaped = normalizePath(pattern)
    .split("*")
    .map((part) => part.replace(/[|\\{}()[\]^$+?.]/g, "\\$&"))
    .join(".*");

  return new RegExp(`(^|/)${escaped}$`);
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/");
}
