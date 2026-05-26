import type { RepoIntelligenceSnapshot } from "@/lib/types/core";
import { traceBlastRadius } from "@/lib/memory/blast-radius";

export interface ArchitectureMapNode {
  id: string;
  label: string;
  path: string;
  kind: string;
  module: string;
  blastDepth: number;
  x: number;
  y: number;
}

export interface ArchitectureMapEdge {
  from: string;
  to: string;
  kind: "import" | "symbol";
}

export interface ArchitectureMapPayload {
  nodes: ArchitectureMapNode[];
  edges: ArchitectureMapEdge[];
  summary: string;
  rootSymbol: string | null;
  impactedCount: number;
}

const MAX_NODES = 120;
const MAX_EDGES = 200;

export async function buildArchitectureMap(input: {
  repo: RepoIntelligenceSnapshot;
  repositoryId?: string;
  blastRootSymbol?: string;
}): Promise<ArchitectureMapPayload> {
  const symbols = input.repo.symbols.slice(0, MAX_NODES);
  const moduleBuckets = new Map<string, typeof symbols>();

  for (const symbol of symbols) {
    const pkgModule = moduleKey(symbol.filePath);
    const bucket = moduleBuckets.get(pkgModule) ?? [];
    bucket.push(symbol);
    moduleBuckets.set(pkgModule, bucket);
  }

  let impactedIds = new Set<string>();
  let rootSymbol: string | null = input.blastRootSymbol ?? symbols.find((s) => s.exported)?.name ?? symbols[0]?.name ?? null;

  if (input.repositoryId && rootSymbol) {
    const blast = await traceBlastRadius(input.repositoryId, rootSymbol);
    impactedIds = new Set(blast.impactedSymbols.map((s) => `${s.filePath}:${s.symbolName}`));
  }

  const nodes: ArchitectureMapNode[] = [];
  let row = 0;
  for (const [pkgModule, bucket] of [...moduleBuckets.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    bucket.forEach((symbol, col) => {
      const id = `${symbol.filePath}:${symbol.name}`;
      nodes.push({
        id,
        label: symbol.name,
        path: symbol.filePath,
        kind: symbol.kind,
        module: pkgModule,
        blastDepth: impactedIds.has(id) ? 1 : 0,
        x: 40 + col * 110,
        y: 40 + row * 72
      });
    });
    row += 1;
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: ArchitectureMapEdge[] = [];

  for (const dep of input.repo.dependencies) {
    const from = nodes.find((n) => n.path === dep.from);
    const to =
      dep.kind === "runtime"
        ? nodes.find((n) => n.path === dep.from && n.label === dep.to) ?? nodes.find((n) => n.label === dep.to)
        : nodes.find((n) => n.path === dep.to);
    if (!from || !to || edges.length >= MAX_EDGES) continue;
    const key = `${from.id}->${to.id}:${dep.kind}`;
    if (edges.some((e) => `${e.from}->${e.to}:${dep.kind}` === key)) continue;
    edges.push({ from: from.id, to: to.id, kind: dep.kind === "runtime" ? "symbol" : "import" });
  }

  const impactedCount = nodes.filter((n) => n.blastDepth > 0).length;
  const summary = buildMapSummary(nodes.length, edges.length, impactedCount, rootSymbol);

  return { nodes, edges, summary, rootSymbol, impactedCount };
}

function moduleKey(filePath: string): string {
  const parts = filePath.split("/");
  if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  return parts[0] ?? "root";
}

function buildMapSummary(nodeCount: number, edgeCount: number, impacted: number, root: string | null): string {
  const base = `BootRise indexed ${nodeCount} symbols and ${edgeCount} dependency links across your imported architecture.`;
  if (!root) return `${base} Select a symbol during Fix to see blast-radius overlay on affected modules.`;
  if (impacted > 0) {
    return `${base} With root symbol "${root}", ${impacted} node(s) sit in the downstream impact zone — review these areas before merge.`;
  }
  return `${base} Root symbol "${root}" is shown; run Fix with a specific file to refresh blast-radius highlighting.`;
}
