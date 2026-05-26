import type { DependencyEdge } from "@/lib/types/core";

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py"];

export function extractImportEdges(filePath: string, source: string): DependencyEdge[] {
  const edges: DependencyEdge[] = [];

  for (const match of source.matchAll(/import(?:\s+type)?[\s\S]*?\sfrom\s+["']([^"']+)["']/g)) {
    edges.push({
      from: filePath,
      to: match[1],
      kind: match[1].startsWith(".") || match[1].startsWith("@/") ? "import" : "package"
    });
  }

  for (const match of source.matchAll(/(?:from|import)\s+([\w.]+)\s+import/g)) {
    edges.push({ from: filePath, to: match[1], kind: "package" });
  }

  return edges;
}

function normalizePath(parts: string[]): string {
  const stack: string[] = [];
  for (const part of parts) {
    if (part === "..") stack.pop();
    else if (part !== "." && part) stack.push(part);
  }
  return stack.join("/");
}

function pickKnownPath(candidate: string, known: Set<string>): string | null {
  if (known.has(candidate)) return candidate;
  for (const ext of EXTENSIONS) {
    if (known.has(`${candidate}${ext}`)) return `${candidate}${ext}`;
  }
  for (const ext of EXTENSIONS) {
    const indexPath = `${candidate}/index${ext}`;
    if (known.has(indexPath)) return indexPath;
  }
  return null;
}

export function resolveImportToFile(fromPath: string, specifier: string, knownPaths: string[]): string | null {
  const known = new Set(knownPaths);
  const fromDir = fromPath.split("/").slice(0, -1);

  if (specifier.startsWith(".")) {
    const joined = normalizePath([...fromDir, ...specifier.split("/")]);
    return pickKnownPath(joined, known);
  }

  if (specifier.startsWith("@/")) {
    const tail = specifier.slice(2);
    const prefixes = ["src/", "app/", "lib/", ""];
    for (const prefix of prefixes) {
      const hit = pickKnownPath(normalizePath([...prefix.split("/").filter(Boolean), ...tail.split("/")]), known);
      if (hit) return hit;
    }
    const suffix = tail.split("/").pop() ?? tail;
    const fuzzy = knownPaths.find(
      (p) => p.endsWith(`/${tail}`) || p.endsWith(`/${tail}.ts`) || p.endsWith(`/${tail}.tsx`) || p.endsWith(`/${suffix}`)
    );
    return fuzzy ?? null;
  }

  return null;
}

export function resolveDependencyEdges(
  files: Array<{ path: string }>,
  edges: DependencyEdge[]
): DependencyEdge[] {
  const paths = files.map((f) => f.path);
  const resolved: DependencyEdge[] = [];

  for (const edge of edges) {
    if (edge.kind === "package") continue;
    const target = resolveImportToFile(edge.from, edge.to, paths);
    if (target && target !== edge.from) {
      resolved.push({ from: edge.from, to: target, kind: "import" });
    }
  }

  return resolved;
}

