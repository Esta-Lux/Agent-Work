import type { AgentTool } from "@/lib/admin/tools/types";
import { readFileTool } from "@/lib/admin/tools/read-file";
import { grepSymbolTool } from "@/lib/admin/tools/grep-symbol";
import { listSymbolsTool } from "@/lib/admin/tools/list-symbols";
import { findCallersTool } from "@/lib/admin/tools/find-callers";
import { listRoutesTool } from "@/lib/admin/tools/list-routes";
import { depGraphTool } from "@/lib/admin/tools/dep-graph";
import { runTypecheckTool } from "@/lib/admin/tools/run-typecheck";
import { runLintTool } from "@/lib/admin/tools/run-lint";
import { runTestsTool } from "@/lib/admin/tools/run-tests";
import { queryMemoryTool } from "@/lib/admin/tools/query-memory";

export const TOOL_OUTPUT_BYTE_CAP = 8192;

export function listAdminAgentTools(): AgentTool[] {
  return [
    readFileTool,
    grepSymbolTool,
    listSymbolsTool,
    findCallersTool,
    listRoutesTool,
    depGraphTool,
    queryMemoryTool,
    runTypecheckTool,
    runLintTool,
    runTestsTool
  ] as AgentTool[];
}

export function findAdminAgentTool(id: string): AgentTool | undefined {
  return listAdminAgentTools().find((tool) => tool.id === id || tool.id.replace(/-/g, "_") === id);
}

export function capToolOutput(output: unknown): { value: unknown; truncated: boolean } {
  let serialized: string;
  try {
    serialized = JSON.stringify(output);
  } catch {
    serialized = String(output);
  }
  if (serialized.length <= TOOL_OUTPUT_BYTE_CAP) {
    return { value: output, truncated: false };
  }
  const sliced = serialized.slice(0, TOOL_OUTPUT_BYTE_CAP);
  return { value: `${sliced}…[truncated]`, truncated: true };
}
