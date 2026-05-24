import { extractImportEdges } from "@/lib/intelligence/dependency-mapper";
import { classifyRepoFile } from "@/lib/intelligence/file-analyzer";
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
  return {
    generatedAt: new Date().toISOString(),
    files: files.map((file) => classifyRepoFile(file.path, file.sizeBytes ?? file.content.length)),
    symbols: files.flatMap((file) => extractLightweightSymbols(file.path, file.content)),
    dependencies: files.flatMap((file) => extractImportEdges(file.path, file.content)),
    architectureMemory
  };
}

