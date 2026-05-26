import { analyzeTypeScriptAst } from "@/lib/intelligence/ast-analyzer";
import { resolveImportToFile } from "@/lib/intelligence/dependency-mapper";
import { shouldIgnoreRepoPath } from "@/lib/intelligence/ignore-rules";
import { extractLightweightSymbols } from "@/lib/intelligence/symbol-tracker";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { LivingLedgerSymbolRecord } from "@/lib/persistence/schema";

export interface SymbolGraphResult {
  symbols: LivingLedgerSymbolRecord[];
  indexedFiles: number;
}

/**
 * Builds Living Ledger symbol records with resolved cross-file dependencies
 * from TypeScript AST analysis (exports, re-exports, calls, imports).
 */
export function buildSymbolGraph(repositoryId: string, files: SourceFileInput[]): SymbolGraphResult {
  const included = files.filter((file) => !shouldIgnoreRepoPath(file.path));
  const paths = included.map((f) => f.path);
  const now = new Date().toISOString();
  const records: LivingLedgerSymbolRecord[] = [];

  const fileSymbolNames = new Map<string, Set<string>>();
  const fileImportBindings = new Map<string, Map<string, string>>();

  for (const file of included) {
    if (!canUseAst(file.path)) {
      const lightweight = extractLightweightSymbols(file.path, file.content);
      fileSymbolNames.set(
        file.path,
        new Set(lightweight.map((s) => s.name))
      );
      continue;
    }

    const analysis = analyzeTypeScriptAst(file.path, file.content);
    fileSymbolNames.set(
      file.path,
      new Set(analysis.symbols.map((s) => s.name))
    );

    const bindings = new Map<string, string>();
    for (const dep of analysis.dependencies) {
      if (dep.kind !== "import") continue;
      const resolved = resolveImportToFile(file.path, dep.to, paths);
      if (resolved) bindings.set(dep.to, resolved);
    }
    fileImportBindings.set(file.path, bindings);
  }

  for (const file of included) {
    if (!canUseAst(file.path)) {
      const lightweight = extractLightweightSymbols(file.path, file.content);
      for (const symbol of lightweight) {
        records.push(toLedgerRecord(repositoryId, file.path, symbol.name, symbol.kind, [], now));
      }
      continue;
    }

    const analysis = analyzeTypeScriptAst(file.path, file.content);
    const globalNameIndex = buildGlobalNameIndex(fileSymbolNames);

    for (const symbolDep of analysis.symbolDependencies) {
      const resolvedDeps = resolveSymbolDependencies(
        symbolDep.dependencies,
        file.path,
        paths,
        fileSymbolNames,
        globalNameIndex
      );

      const symbolMeta = analysis.symbols.find((s) => s.name === symbolDep.symbolName);
      records.push(
        toLedgerRecord(
          repositoryId,
          file.path,
          symbolDep.symbolName,
          symbolMeta?.kind ?? "function",
          resolvedDeps,
          now,
          {
            exported: symbolMeta?.exported ?? false,
            rawDependencies: symbolDep.dependencies
          }
        )
      );
    }
  }

  return { symbols: dedupeRecords(records), indexedFiles: included.length };
}

function buildGlobalNameIndex(fileSymbolNames: Map<string, Set<string>>): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const [filePath, names] of fileSymbolNames) {
    for (const name of names) {
      const list = index.get(name) ?? [];
      list.push(filePath);
      index.set(name, list);
    }
  }
  return index;
}

function resolveSymbolDependencies(
  rawDeps: string[],
  filePath: string,
  paths: string[],
  fileSymbolNames: Map<string, Set<string>>,
  globalNameIndex: Map<string, string[]>
): string[] {
  const resolved = new Set<string>();
  const localNames = fileSymbolNames.get(filePath) ?? new Set();

  for (const dep of rawDeps) {
    if (localNames.has(dep)) {
      resolved.add(dep);
      continue;
    }

    const importTarget = resolveImportToFile(filePath, dep, paths);
    if (importTarget) {
      const targetSymbols = fileSymbolNames.get(importTarget);
      if (targetSymbols) {
        for (const name of targetSymbols) {
          if (name !== dep && !name.startsWith("*:")) resolved.add(name);
        }
      }
      continue;
    }

    const locations = globalNameIndex.get(dep) ?? [];
    if (locations.length === 1 || locations.includes(filePath)) {
      resolved.add(dep);
    } else if (locations.length > 0) {
      resolved.add(dep);
    }
  }

  return Array.from(resolved);
}

function toLedgerRecord(
  repositoryId: string,
  filePath: string,
  symbolName: string,
  symbolKind: string,
  exportDependencies: string[],
  createdAt: string,
  astExtra?: Record<string, unknown>
): LivingLedgerSymbolRecord {
  return {
    id: `${repositoryId}:${filePath}:${symbolName}`,
    repositoryId,
    symbolName,
    symbolKind,
    filePath,
    exportDependencies,
    astNodeData: astExtra ?? {},
    createdAt
  };
}

function dedupeRecords(records: LivingLedgerSymbolRecord[]): LivingLedgerSymbolRecord[] {
  const seen = new Map<string, LivingLedgerSymbolRecord>();
  for (const record of records) {
    seen.set(record.id, record);
  }
  return Array.from(seen.values());
}

function canUseAst(path: string): boolean {
  return /\.(ts|tsx|js|jsx)$/.test(path);
}
