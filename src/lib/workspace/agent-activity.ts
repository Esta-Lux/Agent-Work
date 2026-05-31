import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export type AgentEventType =
  | "environment_setup"
  | "repository_cloned"
  | "mcp_started"
  | "file_search"
  | "file_viewed"
  | "code_search"
  | "command_started"
  | "command_completed"
  | "command_failed"
  | "file_edited"
  | "diff_generated"
  | "test_started"
  | "test_completed"
  | "security_scan_started"
  | "security_scan_completed"
  | "work_unit_started"
  | "work_unit_completed"
  | "work_unit_blocked"
  | "progress_update"
  | "branch_prepared"
  | "pr_prepared"
  | "pr_created";

export type AgentActivityActor =
  | "architect_agent"
  | "project_brain_agent"
  | "builder_agent"
  | "security_agent"
  | "qa_agent"
  | "deployment_agent"
  | "self_agent"
  | "system";

export type AgentActivityStatus = "pending" | "running" | "success" | "warning" | "failed";

export interface AgentActivityEvent {
  id: string;
  projectId: string;
  jobId?: string;
  runId?: string;
  workUnitId?: string;
  actor: AgentActivityActor;
  type: AgentEventType;
  status: AgentActivityStatus;
  title: string;
  detail?: string;
  filePaths?: string[];
  command?: string;
  exitCode?: number;
  durationMs?: number;
  outputPreview?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

const root = resolve(process.cwd(), ".bootrise", "activity");

function storePath(projectId: string) {
  return join(root, `${projectId}.json`);
}

export function listAgentActivityEvents(projectId: string): AgentActivityEvent[] {
  return sortEvents(readStoredEvents(projectId).map(normalizeEvent));
}

export function recordAgentActivityEvent(input: Omit<AgentActivityEvent, "timestamp"> & { timestamp?: string }): AgentActivityEvent {
  const events = readStoredEvents(input.projectId).map(normalizeEvent);
  const event = normalizeEvent({
    ...input,
    timestamp: input.timestamp ?? new Date().toISOString()
  });
  const index = events.findIndex((item) => item.id === event.id);
  if (index >= 0) {
    events[index] = {
      ...events[index],
      ...event,
      timestamp: event.timestamp
    };
  } else {
    events.unshift(event);
  }
  const nextEvents = sortEvents(events).slice(0, 200);
  mkdirSync(root, { recursive: true });
  writeFileSync(storePath(input.projectId), JSON.stringify(nextEvents, null, 2), "utf8");
  return nextEvents.find((item) => item.id === event.id) ?? event;
}

function readStoredEvents(projectId: string): AgentActivityEvent[] {
  const path = storePath(projectId);
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, "utf8")) as AgentActivityEvent[];
  } catch {
    return [];
  }
}

function normalizeEvent(event: AgentActivityEvent): AgentActivityEvent {
  return {
    ...event,
    title: event.title.trim(),
    detail: event.detail?.trim() || undefined,
    filePaths: normalizeFilePaths(event.filePaths),
    outputPreview: event.outputPreview ? event.outputPreview.trim().slice(0, 1200) : undefined,
    metadata: event.metadata && Object.keys(event.metadata).length > 0 ? event.metadata : undefined
  };
}

function normalizeFilePaths(filePaths?: string[]) {
  if (!Array.isArray(filePaths) || filePaths.length === 0) return undefined;
  return Array.from(new Set(filePaths.map((path) => path.trim()).filter(Boolean))).slice(0, 12);
}

function sortEvents(events: AgentActivityEvent[]) {
  return [...events].sort((left, right) => toEpoch(right.timestamp) - toEpoch(left.timestamp));
}

function toEpoch(timestamp: string) {
  return Date.parse(timestamp);
}
