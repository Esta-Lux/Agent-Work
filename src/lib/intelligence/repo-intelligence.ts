import { analyzeTypeScriptAst } from "@/lib/intelligence/ast-analyzer";
import { extractImportEdges } from "@/lib/intelligence/dependency-mapper";
import { classifyRepoFile } from "@/lib/intelligence/file-analyzer";
import { shouldIgnoreRepoPath } from "@/lib/intelligence/ignore-rules";
import { extractLightweightSymbols } from "@/lib/intelligence/symbol-tracker";
import type { ArchitectureMemoryEntry, RepoIntelligenceSnapshot } from "@/lib/types/core";

export interface SourceFileInput {
  path: string;
  content: string;
  sizeBytes?: number;
}

export function buildRepoIntelligenceSnapshot(
  files: SourceFileInput[],
  architectureMemory: ArchitectureMemoryEntry[] = []
): RepoIntelligenceSnapshot {
  const includedFiles = files.filter((file) => !shouldIgnoreRepoPath(file.path));
  const astResults = includedFiles.map((file) => ({
    file,
    analysis: canUseAst(file.path)
      ? analyzeTypeScriptAst(file.path, file.content)
      : {
          symbols: extractLightweightSymbols(file.path, file.content),
          dependencies: extractImportEdges(file.path, file.content)
        }
  }));

  return {
    generatedAt: new Date().toISOString(),
    files: includedFiles.map((file) => classifyRepoFile(file.path, file.sizeBytes ?? file.content.length)),
    symbols: astResults.flatMap((result) => result.analysis.symbols),
    dependencies: astResults.flatMap((result) => result.analysis.dependencies),
    architectureMemory
  };
}

function canUseAst(path: string): boolean {
  return /\.(ts|tsx|js|jsx)$/.test(path);
}
