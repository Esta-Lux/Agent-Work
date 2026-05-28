import type { AgentTool } from "@/lib/admin/tools/types";
import type { CodebaseRouteEntry } from "@/lib/admin/codebase-memory";

interface ListRoutesOutput {
  routes: CodebaseRouteEntry[];
}

export const listRoutesTool: AgentTool<Record<string, never>, ListRoutesOutput> = {
  id: "list-routes",
  title: "List API routes",
  description: "Return the cached self-repo route map (path, HTTP methods, handler file).",
  killSwitchAction: "agent_tool_use",
  safe: true,
  parametersSchema: { type: "object", properties: {} },
  async execute(_args, ctx) {
    return { routes: ctx.memory.routeMap };
  }
};
