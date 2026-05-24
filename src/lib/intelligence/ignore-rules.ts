const ignoredPathParts = [
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".vercel"
];

const ignoredExtensions = [".log", ".lock", ".map", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".zip"];

export function shouldIgnoreRepoPath(path: string): boolean {
  const normalized = path.replaceAll("\\", "/");

  return (
    ignoredPathParts.some((part) => normalized.split("/").includes(part)) ||
    ignoredExtensions.some((extension) => normalized.endsWith(extension))
  );
}

