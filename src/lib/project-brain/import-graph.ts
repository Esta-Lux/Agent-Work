import type { FileSymbolIndex } from "@/lib/project-brain/symbol-indexer";

export interface ImportGraph {
  nodes: string[];
  edges: Array<{ from: string; to: string; importPath: string }>;
}

export function buildImportGraph(index: FileSymbolIndex[]): ImportGraph {
  const nodes = index.map((file) => file.path);
  return {
    nodes,
    edges: index.flatMap((file) =>
      file.imports.map((importPath) => ({
        from: file.path,
        to: resolveImport(importPath, nodes) ?? importPath,
        importPath
      }))
    )
  };
}

function resolveImport(importPath: string, nodes: string[]): string | null {
  const normalized = importPath.replace(/^@\//, "src/");
  return nodes.find((node) => node.includes(normalized.replace(/^\.\//, ""))) ?? null;
}
