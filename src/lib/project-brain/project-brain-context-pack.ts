import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { buildProjectBrainV2, type ProjectBrainV2 } from "@/lib/project-brain/project-brain-v2";

export interface ProjectBrainContextPack {
  repositoryId: string;
  relevantFiles: string[];
  relevantSymbols: string[];
  relatedRoutes: string[];
  relatedEnvVars: string[];
  relatedTests: string[];
  riskNotes: string[];
  tokenEstimate: number;
}

export function buildProjectBrainContextPack(input: {
  repositoryId: string;
  taskText: string;
  files: SourceFileInput[];
  brain?: ProjectBrainV2;
}): ProjectBrainContextPack {
  const brain = input.brain ?? buildProjectBrainV2({ repositoryId: input.repositoryId, files: input.files });
  const tokens = tokenize(input.taskText);
  const relevantFiles = rankFiles(brain.symbolIndex, tokens).slice(0, 20);
  const relevantSymbols = brain.symbolIndex
    .flatMap((entry) => entry.exports)
    .filter((symbol) => tokens.some((token) => symbol.toLowerCase().includes(token)))
    .slice(0, 20);
  const relatedRoutes = brain.routeMap.routes.map((route) => `${route.methods.join("|")} ${route.path}`).slice(0, 20);
  const relatedEnvVars = brain.summary.envVarsReferenced.slice(0, 20);
  const relatedTests = brain.testMap.tests.map((test) => test.path).slice(0, 20);
  const riskNotes = [
    ...brain.summary.unguardedRoutes.map((file) => `Unguarded route detected in ${file}.`),
    ...brain.summary.missingEnvDocs.map((name) => `Missing env documentation for ${name}.`)
  ].slice(0, 20);

  return {
    repositoryId: brain.repositoryId,
    relevantFiles,
    relevantSymbols,
    relatedRoutes,
    relatedEnvVars,
    relatedTests,
    riskNotes,
    tokenEstimate: estimateTokenCost(relevantFiles, relevantSymbols, riskNotes)
  };
}

function tokenize(input: string): string[] {
  return input.toLowerCase().split(/[^a-z0-9_]+/).filter((token) => token.length > 2);
}

function rankFiles(entries: ProjectBrainV2["symbolIndex"], tokens: string[]): string[] {
  return entries
    .map((entry) => {
      const haystack = `${entry.path} ${entry.exports.join(" ")} ${entry.imports.join(" ")}`.toLowerCase();
      const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
      return { path: entry.path, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .map((entry) => entry.path);
}

function estimateTokenCost(files: string[], symbols: string[], risks: string[]): number {
  return Math.max(1, Math.ceil((files.join("\n").length + symbols.join("\n").length + risks.join("\n").length) / 4));
}
