import type { AuthUser } from "@/lib/auth/types";
import type { CodebaseMemorySnapshot } from "@/lib/admin/codebase-memory";

export interface ToolContext {
  repoRoot: string;
  user: AuthUser;
  orgId: string;
  memory: CodebaseMemorySnapshot;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  id: string;
  name: string;
  ok: boolean;
  output: unknown;
  error?: string;
  tokenEstimate?: number;
}

export interface AgentTool<I = Record<string, unknown>, O = unknown> {
  id: string;
  title: string;
  description: string;
  parametersSchema: object;
  killSwitchAction?: "agent_tool_use" | "agent_shell";
  safe: boolean;
  execute(args: I, ctx: ToolContext): Promise<O>;
}
