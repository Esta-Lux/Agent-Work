import type { DependencyEdge } from "@/lib/types/core";

export function extractImportEdges(filePath: string, source: string): DependencyEdge[] {
  const edges: DependencyEdge[] = [];

  for (const match of source.matchAll(/import(?:\s+type)?[\s\S]*?\sfrom\s+["']([^"']+)["']/g)) {
    edges.push({
      from: filePath,
      to: match[1],
      kind: match[1].startsWith(".") || match[1].startsWith("@/") ? "import" : "package"
    });
  }

  return edges;
}

