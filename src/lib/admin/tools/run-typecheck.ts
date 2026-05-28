import { spawnSync } from "node:child_process";
import { assertKillSwitchAllowed } from "@/lib/admin/kill-switches";
import type { AgentTool } from "@/lib/admin/tools/types";

interface ShellOutput {
  command: string;
  exitCode: number;
  output: string;
  truncated: boolean;
}

const MAX_LINES = 200;
const TIMEOUT_MS = 60_000;

function trimOutput(text: string): { output: string; truncated: boolean } {
  const lines = text.split("\n");
  const truncated = lines.length > MAX_LINES;
  return { output: lines.slice(0, MAX_LINES).join("\n"), truncated };
}

export const runTypecheckTool: AgentTool<Record<string, never>, ShellOutput> = {
  id: "run-typecheck",
  title: "Run TypeScript type-check",
  description: "Spawns `npx tsc --noEmit` in the repo root; first 200 lines of combined stdout/stderr returned.",
  killSwitchAction: "agent_shell",
  safe: false,
  parametersSchema: { type: "object", properties: {} },
  async execute(_args, ctx) {
    assertKillSwitchAllowed("agent_shell");
    const result = spawnSync("npx", ["tsc", "--noEmit"], {
      cwd: ctx.repoRoot,
      encoding: "utf8",
      timeout: TIMEOUT_MS
    });
    const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    const { output, truncated } = trimOutput(combined);
    return {
      command: "npx tsc --noEmit",
      exitCode: result.status ?? -1,
      output,
      truncated
    };
  }
};
