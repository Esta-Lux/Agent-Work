import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";

export type WebContainerFileTree = Record<string, unknown>;

const MAX_WEBCONTAINER_FILES = 400;
const MAX_FILE_BYTES = 900_000;

export function selectWebContainerFiles(files: SourceFileInput[]): SourceFileInput[] {
  const eligible = files.filter((f) => {
    if (f.path.includes("node_modules")) return false;
    if ((f.content.length ?? 0) > MAX_FILE_BYTES) return false;
    return true;
  });

  const withPkg = eligible.filter((f) => f.path.endsWith("package.json") || f.path.endsWith("package-lock.json"));
  const frontend = eligible.filter((f) => f.path.startsWith("app/frontend/"));
  const root = eligible.filter((f) => !f.path.includes("/") || f.path.split("/").length <= 2);

  const merged = new Map<string, SourceFileInput>();
  for (const f of [...withPkg, ...frontend, ...root, ...eligible]) {
    if (merged.size >= MAX_WEBCONTAINER_FILES) break;
    merged.set(f.path, f);
  }

  return Array.from(merged.values());
}

export function buildWebContainerFileTree(files: SourceFileInput[]): WebContainerFileTree {
  const tree: WebContainerFileTree = {};

  for (const file of files) {
    const parts = file.path.replace(/\\/g, "/").split("/").filter(Boolean);
    let cursor = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      if (isFile) {
        cursor[part] = { file: { contents: file.content } };
      } else {
        if (!cursor[part] || typeof cursor[part] !== "object" || !("directory" in (cursor[part] as object))) {
          cursor[part] = { directory: {} };
        }
        cursor = (cursor[part] as { directory: WebContainerFileTree }).directory;
      }
    }
  }

  return tree;
}

export function detectWebContainerWorkdir(files: SourceFileInput[]): string {
  if (files.some((f) => f.path === "app/frontend/package.json")) return "app/frontend";
  if (files.some((f) => f.path === "package.json")) return ".";
  if (files.some((f) => f.path.endsWith("package.json"))) {
    const pkg = files.find((f) => f.path.endsWith("package.json"));
    if (pkg) return pkg.path.replace(/\/package\.json$/, "") || ".";
  }
  return ".";
}
