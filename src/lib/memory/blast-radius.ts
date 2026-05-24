import { getSupabaseServiceClient } from "@/lib/db/supabase";
import { memoryStore } from "@/lib/persistence/memory-store";
import type { LivingLedgerSymbolRecord } from "@/lib/persistence/schema";

export interface BlastRadiusResult {
  rootSymbol: string;
  impactedSymbols: LivingLedgerSymbolRecord[];
  sql: string;
}

export async function traceBlastRadius(repositoryId: string, symbolName: string): Promise<BlastRadiusResult> {
  const localSymbols = memoryStore.livingLedgerSymbols.filter((symbol) => symbol.repositoryId === repositoryId);
  const impacted = localSymbols.length > 0 ? traceLocalBlastRadius(localSymbols, symbolName) : await traceSupabaseBlastRadius(repositoryId, symbolName);

  return {
    rootSymbol: symbolName,
    impactedSymbols: impacted,
    sql: blastRadiusSql
  };
}

function traceLocalBlastRadius(symbols: LivingLedgerSymbolRecord[], root: string): LivingLedgerSymbolRecord[] {
  const impacted = new Map<string, LivingLedgerSymbolRecord>();
  const queue = [root];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    for (const symbol of symbols) {
      const key = `${symbol.filePath}:${symbol.symbolName}`;
      if (impacted.has(key)) continue;

      if (symbol.symbolName === current || symbol.exportDependencies.includes(current)) {
        impacted.set(key, symbol);
        queue.push(symbol.symbolName);
      }
    }
  }

  return Array.from(impacted.values());
}

async function traceSupabaseBlastRadius(repositoryId: string, symbolName: string): Promise<LivingLedgerSymbolRecord[]> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("verity_symbols")
    .select("id,repository_id,symbol_name,symbol_kind,file_path,export_dependencies,ast_node_data,created_at")
    .eq("repository_id", repositoryId);

  const symbols =
    data?.map((symbol) => ({
      id: symbol.id,
      repositoryId: symbol.repository_id,
      symbolName: symbol.symbol_name,
      symbolKind: symbol.symbol_kind,
      filePath: symbol.file_path,
      exportDependencies: symbol.export_dependencies ?? [],
      astNodeData: symbol.ast_node_data ?? {},
      createdAt: symbol.created_at
    })) ?? [];

  return traceLocalBlastRadius(symbols, symbolName);
}

export const blastRadiusSql = `with recursive blast_radius as (
  select symbol_name, file_path, export_dependencies
  from verity_symbols
  where repository_id = :repository_id and symbol_name = :symbol_name
  union
  select s.symbol_name, s.file_path, s.export_dependencies
  from verity_symbols s
  inner join blast_radius b on s.export_dependencies @> jsonb_build_array(b.symbol_name)
  where s.repository_id = :repository_id
)
select * from blast_radius;`;

