import { loadSelfRepoSnapshot } from "@/lib/admin/self-repo";
import { SELF_REPOSITORY_ID } from "@/lib/admin/self-repo";
import { buildSymbolGraph } from "@/lib/intelligence/symbol-graph";
import type { AgentTool } from "@/lib/admin/tools/types";

interface FindCallersArgs {
  symbol?: string;
  maxCallers?: number;
}

interface CallerHit {
  filePath: string;
  symbolName: string;
}

interface FindCallersOutput {
  symbol: string;
  callers: CallerHit[];
  truncated: boolean;
}

const DEFAULT_MAX = 30;

export const findCallersTool: AgentTool<FindCallersArgs, FindCallersOutput> = {
  id: "find-callers",
  title: "Find symbol callers",
  description: "List symbols whose export dependencies reference the target symbol name.",
  killSwitchAction: "agent_tool_use",
  safe: true,
  parametersSchema: {
    type: "object",
    properties: {
      symbol: { type: "string", description: "Symbol name (exact match)." },
      maxCallers: { type: "integer", description: "Cap (default 30)." }
    },
    required: ["symbol"]
  },
  async execute(args) {
    const symbol = (args?.symbol ?? "").trim();
    if (!symbol) throw new Error("find-callers: symbol is required.");
    const maxCallers = Math.min(Math.max(args?.maxCallers ?? DEFAULT_MAX, 1), 200);

    const files = loadSelfRepoSnapshot();
    const graph = buildSymbolGraph(SELF_REPOSITORY_ID, files);
    const callers: CallerHit[] = [];
    for (const record of graph.symbols) {
      if (record.symbolName === symbol) continue;
      if ((record.exportDependencies ?? []).includes(symbol)) {
        callers.push({ filePath: record.filePath, symbolName: record.symbolName });
        if (callers.length >= maxCallers) break;
      }
    }
    return { symbol, callers, truncated: callers.length >= maxCallers };
  }
};
