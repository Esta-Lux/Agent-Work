import { loadSelfRepoSnapshot } from "@/lib/admin/self-repo";
import { analyzeTypeScriptAst } from "@/lib/intelligence/ast-analyzer";
import type { AgentTool } from "@/lib/admin/tools/types";

interface ListSymbolsArgs {
  path?: string;
}

interface SymbolEntry {
  name: string;
  kind: string;
  exported: boolean;
}

interface ListSymbolsOutput {
  path: string;
  symbols: SymbolEntry[];
}

export const listSymbolsTool: AgentTool<ListSymbolsArgs, ListSymbolsOutput> = {
  id: "list-symbols",
  title: "List symbols in file",
  description: "Return the exported and local symbols discovered by the TypeScript AST analyzer for a single file.",
  killSwitchAction: "agent_tool_use",
  safe: true,
  parametersSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Repo-relative TypeScript/TSX file path." }
    },
    required: ["path"]
  },
  async execute(args) {
    const path = (args?.path ?? "").trim();
    if (!path) throw new Error("list-symbols: path is required.");
    if (!/\.(ts|tsx|mts|cts)$/.test(path)) {
      throw new Error("list-symbols: only TypeScript files supported.");
    }
    const files = loadSelfRepoSnapshot();
    const file = files.find((f) => f.path === path);
    if (!file) throw new Error(`list-symbols: '${path}' not present in repo snapshot.`);
    const analysis = analyzeTypeScriptAst(file.path, file.content);
    return {
      path: file.path,
      symbols: analysis.symbols.map((s) => ({ name: s.name, kind: s.kind, exported: s.exported }))
    };
  }
};
