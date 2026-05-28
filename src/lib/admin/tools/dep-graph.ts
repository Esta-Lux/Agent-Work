import { SELF_REPOSITORY_ID, loadSelfRepoSnapshot } from "@/lib/admin/self-repo";
import { buildRepoGraph } from "@/lib/intelligence/repo-graph";
import type { AgentTool } from "@/lib/admin/tools/types";

interface DepGraphArgs {
  path?: string;
  depth?: number;
}

interface DepGraphOutput {
  path: string;
  depth: number;
  outgoing: string[];
  incoming: string[];
}

export const depGraphTool: AgentTool<DepGraphArgs, DepGraphOutput> = {
  id: "dep-graph",
  title: "Inspect dependency graph",
  description: "Return depth-1 outgoing and incoming dependency edges for a single repo file (depth=2 reachable hubs).",
  killSwitchAction: "agent_tool_use",
  safe: true,
  parametersSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Repo-relative file path." },
      depth: { type: "integer", description: "1 or 2 (default 1)." }
    },
    required: ["path"]
  },
  async execute(args) {
    const path = (args?.path ?? "").trim();
    if (!path) throw new Error("dep-graph: path is required.");
    const depth = args?.depth === 2 ? 2 : 1;
    const files = loadSelfRepoSnapshot();
    const graph = buildRepoGraph(SELF_REPOSITORY_ID, files);
    const outgoingSet = new Set<string>();
    const incomingSet = new Set<string>();
    for (const edge of graph.edges) {
      if (edge.from === path) outgoingSet.add(edge.to);
      if (edge.to === path) incomingSet.add(edge.from);
    }
    if (depth === 2) {
      const firstHopOut = [...outgoingSet];
      for (const edge of graph.edges) {
        if (firstHopOut.includes(edge.from)) outgoingSet.add(edge.to);
      }
    }
    return {
      path,
      depth,
      outgoing: [...outgoingSet].slice(0, 60),
      incoming: [...incomingSet].slice(0, 60)
    };
  }
};
