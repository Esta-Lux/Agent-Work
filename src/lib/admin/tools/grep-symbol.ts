import { loadSelfRepoSnapshot } from "@/lib/admin/self-repo";
import type { AgentTool } from "@/lib/admin/tools/types";

interface GrepArgs {
  query?: string;
  maxMatches?: number;
}

interface TextHit {
  path: string;
  line: number;
  preview: string;
}

interface GrepOutput {
  query: string;
  symbolHits: string[];
  textHits: TextHit[];
  truncated: boolean;
}

const DEFAULT_MAX = 30;

export const grepSymbolTool: AgentTool<GrepArgs, GrepOutput> = {
  id: "grep-symbol",
  title: "Grep symbol or literal",
  description: "Search the self-repo for a literal substring; returns symbol-name matches plus file/line previews.",
  killSwitchAction: "agent_tool_use",
  safe: true,
  parametersSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Literal substring to search for (case-insensitive)." },
      maxMatches: { type: "integer", description: "Cap on text hits (default 30, max 200)." }
    },
    required: ["query"]
  },
  async execute(args, ctx) {
    const query = (args?.query ?? "").trim();
    if (!query) throw new Error("grep-symbol: query is required.");
    const maxMatches = Math.min(Math.max(args?.maxMatches ?? DEFAULT_MAX, 1), 200);
    const needle = query.toLowerCase();

    const symbolHits: string[] = [];
    for (const entry of ctx.memory.routeMap) {
      if (entry.path.toLowerCase().includes(needle)) symbolHits.push(`route:${entry.path}`);
    }
    for (const hub of ctx.memory.topHubs) {
      if (hub.toLowerCase().includes(needle)) symbolHits.push(`hub:${hub}`);
    }

    const textHits: TextHit[] = [];
    let truncated = false;
    const files = loadSelfRepoSnapshot();
    for (const file of files) {
      if (textHits.length >= maxMatches) {
        truncated = true;
        break;
      }
      const lower = file.content.toLowerCase();
      let from = 0;
      while (from < lower.length) {
        const idx = lower.indexOf(needle, from);
        if (idx < 0) break;
        const lineStart = lower.lastIndexOf("\n", idx) + 1;
        const lineEnd = lower.indexOf("\n", idx);
        const line = file.content.slice(lineStart, lineEnd < 0 ? file.content.length : lineEnd).slice(0, 200);
        const lineNumber = file.content.slice(0, lineStart).split("\n").length;
        textHits.push({ path: file.path, line: lineNumber, preview: line });
        if (textHits.length >= maxMatches) {
          truncated = true;
          break;
        }
        from = idx + needle.length;
      }
    }

    return { query, symbolHits: symbolHits.slice(0, 50), textHits, truncated };
  }
};
