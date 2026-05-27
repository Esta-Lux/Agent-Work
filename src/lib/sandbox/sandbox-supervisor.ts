import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import {
  closeSandboxSession,
  createSandboxSession,
  evaluateToolBoundary,
  getSandboxSession,
  isSandboxLifecycleEnabled,
  recordSandboxToolCall,
  transitionSandbox,
  type SandboxSessionRecord,
  type SandboxToolName
} from "@/lib/sandbox/sandbox-lifecycle";

export interface SupervisorToolRequest {
  sessionId: string;
  tool: SandboxToolName;
  path?: string;
  command?: string;
}

export interface SupervisorToolResult {
  allowed: boolean;
  reason: string;
  session?: SandboxSessionRecord;
}

/** BootRise supervisor gate — workers never call tools without this check. */
export function supervisorAuthorizeTool(req: SupervisorToolRequest): SupervisorToolResult {
  const session = getSandboxSession(req.sessionId);
  if (!session) {
    return { allowed: false, reason: "Unknown sandbox session." };
  }
  const boundary = evaluateToolBoundary(session, req.tool, { command: req.command });
  return { allowed: boundary.allowed, reason: boundary.reason, session };
}

export function supervisorRecordTool(req: SupervisorToolRequest, ok: boolean): void {
  if (!isSandboxLifecycleEnabled()) return;
  recordSandboxToolCall(req.sessionId, req.tool, ok);
}

export async function runSupervisedVerifyPrep(
  repositoryId: string,
  files: SourceFileInput[]
): Promise<{ sessionId: string | null; enabled: boolean }> {
  if (!isSandboxLifecycleEnabled()) {
    return { sessionId: null, enabled: false };
  }
  const session = createSandboxSession(repositoryId);
  const writeCheck = supervisorAuthorizeTool({ sessionId: session.sessionId, tool: "write_file" });
  if (!writeCheck.allowed) {
    transitionSandbox(session.sessionId, "error", writeCheck.reason);
    return { sessionId: session.sessionId, enabled: true };
  }
  supervisorRecordTool({ sessionId: session.sessionId, tool: "write_file" }, true);
  void files.length;
  return { sessionId: session.sessionId, enabled: true };
}

export function runSupervisedVerifyComplete(sessionId: string | null, passed: boolean): void {
  if (!sessionId || !isSandboxLifecycleEnabled()) return;
  supervisorRecordTool({ sessionId, tool: "run_command" }, passed);
  if (passed) closeSandboxSession(sessionId);
  else transitionSandbox(sessionId, "error", "Verification failed");
}
