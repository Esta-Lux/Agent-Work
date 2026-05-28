import type { ToolLoopEvent } from "@/lib/admin/agent-tool-loop";

export type AgentRunStatus = "running" | "complete" | "failed";

export type AgentRole = "planner" | "coder" | "reviewer";

export interface AgentRunEvent extends ToolLoopEvent {
  at: string;
}

export interface AgentRun {
  id: string;
  pendingFixId?: string;
  agent: AgentRole;
  status: AgentRunStatus;
  events: AgentRunEvent[];
  startedAt: string;
  finishedAt?: string;
  errorMessage?: string;
}

export interface ReviewFinding {
  severity: "info" | "warning" | "critical";
  message: string;
  path?: string;
}

export interface ReviewResult {
  verdict: "approve" | "reject" | "needs_changes";
  findings: ReviewFinding[];
}

const MAX_EVENTS = 200;

export function recordEvent(run: AgentRun, event: ToolLoopEvent): void {
  if (run.events.length >= MAX_EVENTS) return;
  run.events.push({ ...event, at: new Date().toISOString() });
}

export function createAgentRun(agent: AgentRole, pendingFixId?: string): AgentRun {
  return {
    id: `run_${agent}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    pendingFixId,
    agent,
    status: "running",
    events: [],
    startedAt: new Date().toISOString()
  };
}

export function completeAgentRun(run: AgentRun, error?: Error | string | null): AgentRun {
  run.finishedAt = new Date().toISOString();
  if (error) {
    run.status = "failed";
    run.errorMessage = typeof error === "string" ? error : error.message;
  } else {
    run.status = "complete";
  }
  return run;
}
