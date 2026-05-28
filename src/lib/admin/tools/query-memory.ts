import type { AgentTool } from "@/lib/admin/tools/types";

interface QueryMemoryOutput {
  generatedAt: string;
  fileCount: number;
  symbolCount: number;
  topHubs: string[];
  routeMapSize: number;
  recentEdits: Array<{ path: string; touchedAt: string }>;
}

export const queryMemoryTool: AgentTool<Record<string, never>, QueryMemoryOutput> = {
  id: "query-memory",
  title: "Query codebase memory",
  description: "Return a digest of the cached codebase memory: top hubs, route count, recent edits.",
  killSwitchAction: "agent_tool_use",
  safe: true,
  parametersSchema: { type: "object", properties: {} },
  async execute(_args, ctx) {
    return {
      generatedAt: ctx.memory.generatedAt,
      fileCount: ctx.memory.fileCount,
      symbolCount: ctx.memory.symbolCount,
      topHubs: ctx.memory.topHubs,
      routeMapSize: ctx.memory.routeMap.length,
      recentEdits: ctx.memory.recentEdits.slice(0, 15)
    };
  }
};
