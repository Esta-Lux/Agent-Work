import { loadSelfRepoSnapshot } from "@/lib/admin/self-repo";
import type { AgentTool } from "@/lib/admin/tools/types";

const DEFAULT_MAX_BYTES = 8192;
const HARD_DENY_PATTERNS = [/\.env(\..+)?$/i];
const ALLOW_ENV_EXAMPLE = /\.env\.example$/i;

interface ReadFileArgs {
  path?: string;
  maxBytes?: number;
}

interface ReadFileOutput {
  path: string;
  content: string;
  sizeBytes: number;
  truncated: boolean;
}

function isDeniedPath(path: string): boolean {
  if (path.includes("..") || path.startsWith("/")) return true;
  if (ALLOW_ENV_EXAMPLE.test(path)) return false;
  return HARD_DENY_PATTERNS.some((re) => re.test(path));
}

export const readFileTool: AgentTool<ReadFileArgs, ReadFileOutput> = {
  id: "read-file",
  title: "Read repo file",
  description: "Read a snapshot file from the self-repo (denylist enforced; .env* files refused except .env.example).",
  killSwitchAction: "agent_tool_use",
  safe: true,
  parametersSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Repo-relative file path (no leading slash, no ..)" },
      maxBytes: { type: "integer", description: "Optional cap (default 8192, max 65536)" }
    },
    required: ["path"]
  },
  async execute(args) {
    const path = (args?.path ?? "").trim();
    if (!path) throw new Error("read-file: path is required.");
    if (isDeniedPath(path)) throw new Error(`read-file: path '${path}' is denied.`);
    const maxBytes = Math.min(Math.max(args?.maxBytes ?? DEFAULT_MAX_BYTES, 256), 65536);
    const files = loadSelfRepoSnapshot();
    const file = files.find((f) => f.path === path);
    if (!file) throw new Error(`read-file: '${path}' not present in repo snapshot.`);
    const truncated = file.content.length > maxBytes;
    const content = truncated ? file.content.slice(0, maxBytes) : file.content;
    return { path: file.path, content, sizeBytes: file.sizeBytes ?? file.content.length, truncated };
  }
};
