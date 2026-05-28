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
const TIMEOUT_MS = 120_000;

export const runTestsTool: AgentTool<Record<string, never>, ShellOutput> = {
  id: "run-tests",
  title: "Run unit tests",
  description: "Spawns `npm run test:unit`; first 200 lines returned.",
  killSwitchAction: "agent_shell",
  safe: false,
  parametersSchema: { type: "object", properties: {} },
  async execute(_args, ctx) {
    assertKillSwitchAllowed("agent_shell");
    const result = spawnSync("npm", ["run", "test:unit"], {
      cwd: ctx.repoRoot,
      encoding: "utf8",
      timeout: TIMEOUT_MS
    });
    const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    const lines = combined.split("\n");
    const truncated = lines.length > MAX_LINES;
    return {
      command: "npm run test:unit",
      exitCode: result.status ?? -1,
      output: lines.slice(0, MAX_LINES).join("\n"),
      truncated
    };
  }
};
