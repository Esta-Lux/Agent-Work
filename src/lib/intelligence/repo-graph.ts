import { buildSymbolGraph } from "@/lib/intelligence/symbol-graph";
import { classifyRepoPath, type RepoArea } from "@/lib/workspace/file-ranking";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";

export interface RepoModuleNode {
  area: RepoArea;
  name: string;
  paths: string[];
  fileCount: number;
}

export interface RepoGraphEdge {
  from: string;
  to: string;
  kind: "depends_on";
}

export interface RepoGraphSummary {
  repositoryId: string;
  modules: RepoModuleNode[];
  edges: RepoGraphEdge[];
  hubFiles: string[];
  totalSymbols: number;
  summary: string;
}

const MODULE_ROOTS: Array<{ prefix: string; area: RepoArea; name: string }> = [
  { prefix: "app/mobile/", area: "mobile", name: "Mobile (Expo)" },
  { prefix: "app/frontend/", area: "frontend", name: "Web frontend" },
  { prefix: "app/backend/", area: "backend", name: "Backend API" },
  { prefix: "docs/", area: "docs", name: "Docs" }
];

export function buildRepoGraph(repositoryId: string, files: SourceFileInput[]): RepoGraphSummary {
  const modules: RepoModuleNode[] = MODULE_ROOTS.map((root) => {
    const paths = files
      .map((f) => f.path)
      .filter((p) => p.replace(/\\/g, "/").startsWith(root.prefix));
    return {
      area: root.area,
      name: root.name,
      paths: paths.slice(0, 12),
      fileCount: paths.length
    };
  }).filter((m) => m.fileCount > 0);

  const symbolResult = files.length <= 800 ? buildSymbolGraph(repositoryId, files) : { symbols: [], indexedFiles: 0 };
  const depCount = new Map<string, number>();
  const edges: RepoGraphEdge[] = [];

  for (const sym of symbolResult.symbols) {
    for (const dep of sym.exportDependencies ?? []) {
      if (!dep) continue;
      edges.push({ from: sym.filePath, to: dep, kind: "depends_on" });
      depCount.set(dep, (depCount.get(dep) ?? 0) + 1);
    }
  }

  const hubFiles = [...depCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([file]) => file);

  const crossModule = modules.filter((m) => m.fileCount > 0).length;
  const summary = [
    `${modules.reduce((n, m) => n + m.fileCount, 0)} files across ${crossModule} product modules`,
    symbolResult.symbols.length > 0 ? `${symbolResult.symbols.length} symbols indexed` : "symbol graph skipped (large corpus)",
    hubFiles.length ? `Hub files: ${hubFiles.slice(0, 3).join(", ")}` : null
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    repositoryId,
    modules,
    edges: edges.slice(0, 500),
    hubFiles,
    totalSymbols: symbolResult.symbols.length,
    summary
  };
}

/** RepoMaster-style expansion: add graph neighbors of already-selected paths. */
export function expandPathsWithRepoGraph(
  seedPaths: Set<string>,
  graph: RepoGraphSummary,
  allPaths: Set<string>,
  maxExtra = 16
): string[] {
  const extra: string[] = [];
  const edgeByFrom = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const list = edgeByFrom.get(edge.from) ?? [];
    list.push(edge.to);
    edgeByFrom.set(edge.from, list);
  }

  for (const seed of seedPaths) {
    for (const neighbor of edgeByFrom.get(seed) ?? []) {
      if (!allPaths.has(neighbor) && !seedPaths.has(neighbor)) {
        extra.push(neighbor);
        if (extra.length >= maxExtra) return extra;
      }
    }
  }

  for (const hub of graph.hubFiles) {
    if (extra.length >= maxExtra) break;
    if (!seedPaths.has(hub) && allPaths.has(hub)) extra.push(hub);
  }

  return extra.slice(0, maxExtra);
}

export function rankFilesByGraphProximity(
  request: string,
  files: SourceFileInput[],
  graph: RepoGraphSummary,
  maxFiles: number
): SourceFileInput[] {
  const n = request.toLowerCase();
  const byPath = new Map(files.map((f) => [f.path, f]));
  const scored = files.map((file) => {
    let score = 0;
    if (graph.hubFiles.includes(file.path)) score += 8;
    const area = classifyRepoPath(file.path);
    if (/mobile|expo|map|nav/.test(n) && area === "mobile") score += 10;
    if (/backend|api|fastapi/.test(n) && area === "backend") score += 10;
    if (/frontend|web|vite/.test(n) && area === "frontend") score += 10;
    for (const token of n.split(/\W+/).filter((t) => t.length > 3)) {
      if (file.path.toLowerCase().includes(token)) score += 4;
    }
    return { file, score };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFiles)
    .map((row) => row.file)
    .filter((f): f is SourceFileInput => Boolean(byPath.get(f.path)));
}
