/**
 * OpenHands-inspired sandbox lifecycle — BootRise remains supervisor (no autonomous agent).
 */

export type SandboxLifecycleState =
  | "idle"
  | "provisioning"
  | "ready"
  | "executing"
  | "stopping"
  | "stopped"
  | "error";

export type SandboxToolName = "read_file" | "write_file" | "run_command" | "list_dir";

export interface SandboxToolBoundary {
  tool: SandboxToolName;
  allowed: boolean;
  reason: string;
}

export interface SandboxSessionRecord {
  sessionId: string;
  repositoryId: string;
  state: SandboxLifecycleState;
  workerId: string;
  createdAt: string;
  updatedAt: string;
  toolCalls: number;
  lastError?: string;
  isolation: {
    network: "deny" | "allow";
    maxToolCalls: number;
    allowedCommands: string[];
  };
}

const DEFAULT_ALLOWED_COMMANDS = ["npm", "npx", "node", "python", "python3", "tsc", "eslint", "pytest"];

const sessions = new Map<string, SandboxSessionRecord>();

export function isSandboxLifecycleEnabled(): boolean {
  return process.env.BOOTRISE_SANDBOX_LIFECYCLE === "1" || process.env.BOOTRISE_SANDBOX_LIFECYCLE === "true";
}

export function createSandboxSession(repositoryId: string): SandboxSessionRecord {
  const sessionId = `sbx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const record: SandboxSessionRecord = {
    sessionId,
    repositoryId,
    state: "provisioning",
    workerId: `worker_${repositoryId.slice(0, 12)}`,
    createdAt: now,
    updatedAt: now,
    toolCalls: 0,
    isolation: {
      network: process.env.BOOTRISE_SANDBOX_NETWORK === "allow" ? "allow" : "deny",
      maxToolCalls: Number(process.env.BOOTRISE_SANDBOX_MAX_TOOL_CALLS ?? "48"),
      allowedCommands: DEFAULT_ALLOWED_COMMANDS
    }
  };
  sessions.set(sessionId, record);
  transitionSandbox(sessionId, "ready");
  return sessions.get(sessionId)!;
}

export function getSandboxSession(sessionId: string): SandboxSessionRecord | undefined {
  return sessions.get(sessionId);
}

export function listSandboxSessions(repositoryId?: string): SandboxSessionRecord[] {
  const all = [...sessions.values()];
  return repositoryId ? all.filter((s) => s.repositoryId === repositoryId) : all;
}

export function transitionSandbox(sessionId: string, next: SandboxLifecycleState, error?: string): SandboxSessionRecord | null {
  const record = sessions.get(sessionId);
  if (!record) return null;
  const allowed: Record<SandboxLifecycleState, SandboxLifecycleState[]> = {
    idle: ["provisioning"],
    provisioning: ["ready", "error"],
    ready: ["executing", "stopping", "stopped"],
    executing: ["ready", "stopping", "error"],
    stopping: ["stopped", "error"],
    stopped: ["provisioning"],
    error: ["provisioning", "stopped"]
  };
  if (!allowed[record.state].includes(next)) {
    record.lastError = `Invalid transition ${record.state} → ${next}`;
    record.state = "error";
  } else {
    record.state = next;
    if (error) record.lastError = error;
    else if (next !== "error") record.lastError = undefined;
  }
  record.updatedAt = new Date().toISOString();
  return record;
}

export function evaluateToolBoundary(
  session: SandboxSessionRecord,
  tool: SandboxToolName,
  payload?: { command?: string }
): SandboxToolBoundary {
  if (session.state !== "ready" && session.state !== "executing") {
    return { tool, allowed: false, reason: `Sandbox is ${session.state} — wait for ready.` };
  }
  if (session.toolCalls >= session.isolation.maxToolCalls) {
    return { tool, allowed: false, reason: "Tool call budget exceeded for this session." };
  }
  if (tool === "run_command" && payload?.command) {
    const program = payload.command.trim().split(/\s+/)[0]?.replace(/^.*\//, "") ?? "";
    if (!session.isolation.allowedCommands.includes(program)) {
      return {
        tool,
        allowed: false,
        reason: `Command "${program}" not in sandbox allowlist (supervisor policy).`
      };
    }
  }
  return { tool, allowed: true, reason: "Within supervisor tool boundary." };
}

export function recordSandboxToolCall(sessionId: string, tool: SandboxToolName, ok: boolean): void {
  const record = sessions.get(sessionId);
  if (!record) return;
  record.toolCalls += 1;
  record.updatedAt = new Date().toISOString();
  if (record.state === "ready") record.state = "executing";
  if (!ok) record.state = "error";
  else if (record.state === "executing") record.state = "ready";
}

export function closeSandboxSession(sessionId: string): void {
  transitionSandbox(sessionId, "stopping");
  transitionSandbox(sessionId, "stopped");
}
