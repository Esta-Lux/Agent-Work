import { Project, SyntaxKind } from "ts-morph";
import { getSupabaseServiceClient } from "@/lib/db/supabase";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { shouldIgnoreRepoPath } from "@/lib/intelligence/ignore-rules";
import { memoryStore, upsertRecord } from "@/lib/persistence/memory-store";
import type { EpistemicLedgerRecord, LivingLedgerSymbolRecord } from "@/lib/persistence/schema";

export interface SystemSymbol {
  name: string;
  filePath: string;
  kind: string;
  calls: string[];
  astNodeData: Record<string, unknown>;
}

export interface CompiledContext {
  sourceCode: string;
  architecturalIntent: string;
  rules: string[];
  historicalCaveats: string[];
  symbol?: SystemSymbol;
}

export class ContextBuilder {
  private project: Project;
  private files: SourceFileInput[];

  constructor(files: SourceFileInput[]) {
    this.project = new Project({
      useInMemoryFileSystem: true,
      skipAddingFilesFromTsConfig: true
    });
    this.files = files.filter((file) => !shouldIgnoreRepoPath(file.path));

    for (const file of this.files) {
      if (/\.(ts|tsx|js|jsx)$/.test(file.path)) {
        this.project.createSourceFile(normalizePath(file.path), file.content, { overwrite: true });
      }
    }
  }

  public extractSymbolGraph(): SystemSymbol[] {
    const symbols: SystemSymbol[] = [];

    for (const sourceFile of this.project.getSourceFiles()) {
      const filePath = sourceFile.getFilePath().replace(/^\//, "");
      sourceFile.getExportedDeclarations().forEach((declarations, name) => {
        for (const declaration of declarations) {
          const calls = declaration
            .getDescendantsOfKind(SyntaxKind.Identifier)
            .map((node) => node.getText())
            .filter((identifier) => identifier !== name);

          symbols.push({
            name,
            filePath,
            kind: declaration.getKindName(),
            calls: Array.from(new Set(calls)),
            astNodeData: {
              kind: declaration.getKindName(),
              textPreview: declaration.getText().slice(0, 1200),
              startLine: declaration.getStartLineNumber(),
              endLine: declaration.getEndLineNumber()
            }
          });
        }
      });
    }

    return symbols;
  }

  public async persistStaticMemory(repositoryId: string): Promise<LivingLedgerSymbolRecord[]> {
    const now = new Date().toISOString();
    const symbols = this.extractSymbolGraph().map((symbol) => ({
      id: `${repositoryId}:${symbol.filePath}:${symbol.name}`,
      repositoryId,
      symbolName: symbol.name,
      symbolKind: symbol.kind,
      filePath: symbol.filePath,
      exportDependencies: symbol.calls,
      astNodeData: symbol.astNodeData,
      createdAt: now
    }));

    for (const symbol of symbols) {
      upsertRecord(memoryStore.livingLedgerSymbols, symbol);
    }

    const supabase = getSupabaseServiceClient();
    if (supabase && symbols.length > 0) {
      await supabase.from("verity_symbols").upsert(
        symbols.map((symbol) => ({
          repository_id: symbol.repositoryId,
          symbol_name: symbol.symbolName,
          symbol_kind: symbol.symbolKind,
          file_path: symbol.filePath,
          export_dependencies: symbol.exportDependencies,
          ast_node_data: symbol.astNodeData
        })),
        {
          onConflict: "repository_id,symbol_name,file_path",
          ignoreDuplicates: false
        }
      );
    }

    return symbols;
  }

  public async compileContext(repositoryId: string, targetFile: string, symbolName: string): Promise<CompiledContext> {
    const normalizedTarget = normalizePath(targetFile);
    const file = this.files.find((candidate) => normalizePath(candidate.path) === normalizedTarget);
    const symbol = this.extractSymbolGraph().find(
      (candidate) => candidate.name === symbolName && normalizePath(candidate.filePath) === normalizedTarget
    );
    const ledger = await findLedgerEntry(repositoryId, normalizedTarget, symbolName);

    return {
      sourceCode: file?.content ?? "",
      architecturalIntent: ledger?.architecturalIntent ?? "No past decisions recorded.",
      rules: ledger?.rules ?? [],
      historicalCaveats: ledger?.scarTissue ?? [],
      symbol
    };
  }
}

export async function recordEpistemicMemory(entry: Omit<EpistemicLedgerRecord, "id" | "updatedAt">): Promise<EpistemicLedgerRecord> {
  const now = new Date().toISOString();
  const record: EpistemicLedgerRecord = {
    ...entry,
    id: `${entry.repositoryId}:${entry.filePath}:${entry.symbolName}`,
    updatedAt: now
  };

  upsertRecord(memoryStore.epistemicLedger, record);

  const supabase = getSupabaseServiceClient();
  if (supabase) {
    await supabase.from("verity_epistemic_ledger").upsert(
      {
        repository_id: record.repositoryId,
        symbol_name: record.symbolName,
        file_path: record.filePath,
        architectural_intent: record.architecturalIntent,
        rules: record.rules,
        scar_tissue: record.scarTissue,
        updated_at: record.updatedAt
      },
      {
        onConflict: "repository_id,symbol_name,file_path",
        ignoreDuplicates: false
      }
    );
  }

  return record;
}

async function findLedgerEntry(
  repositoryId: string,
  filePath: string,
  symbolName: string
): Promise<EpistemicLedgerRecord | undefined> {
  const local = memoryStore.epistemicLedger.find(
    (entry) => entry.repositoryId === repositoryId && entry.filePath === filePath && entry.symbolName === symbolName
  );
  if (local) return local;

  const supabase = getSupabaseServiceClient();
  if (!supabase) return undefined;

  const { data } = await supabase
    .from("verity_epistemic_ledger")
    .select("repository_id,symbol_name,file_path,architectural_intent,rules,scar_tissue,updated_at")
    .eq("repository_id", repositoryId)
    .eq("symbol_name", symbolName)
    .eq("file_path", filePath)
    .maybeSingle();

  if (!data) return undefined;

  return {
    id: `${data.repository_id}:${data.file_path}:${data.symbol_name}`,
    repositoryId: data.repository_id,
    symbolName: data.symbol_name,
    filePath: data.file_path,
    architecturalIntent: data.architectural_intent,
    rules: data.rules ?? [],
    scarTissue: data.scar_tissue ?? [],
    updatedAt: data.updated_at
  };
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\//, "");
}

