import type { RepoFile } from "@/lib/types/core";

const languageByExtension: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript-react",
  ".js": "javascript",
  ".jsx": "javascript-react",
  ".json": "json",
  ".sql": "sql",
  ".md": "markdown",
  ".yml": "yaml",
  ".yaml": "yaml",
  ".toml": "toml",
  ".css": "css"
};

export function classifyRepoFile(path: string, sizeBytes = 0): RepoFile {
  const extension = path.includes(".") ? path.slice(path.lastIndexOf(".")) : "";
  const language = languageByExtension[extension] ?? "unknown";

  return {
    path,
    language,
    sizeBytes,
    role: classifyRole(path)
  };
}

function classifyRole(path: string): RepoFile["role"] {
  if (path.endsWith(".test.ts") || path.endsWith(".test.tsx") || path.includes("__tests__")) {
    return "test";
  }

  if (path.endsWith(".sql") || path.includes("schema") || path.includes("migrations")) {
    return "schema";
  }

  if (path.endsWith(".md")) {
    return "docs";
  }

  if (path.includes("config") || path.endsWith(".json") || path.endsWith(".yml") || path.endsWith(".yaml")) {
    return "config";
  }

  if (path.startsWith("src/") || path.startsWith("app/")) {
    return "source";
  }

  return "unknown";
}

