import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { AgentActivityEvent } from "@/lib/agent-activity/agent-activity-types";

const root = resolve(process.cwd(), ".bootrise", "agent-activity");

function storePath(projectId: string) {
  return join(root, `${projectId}.json`);
}

function normalizeFilePaths(filePaths?: string[]) {
  if (!Array.isArray(filePaths) || filePaths.length === 0) return undefined;
  return Array.from(new Set(filePaths.map((path) => path.trim()).filter(Boolean))).slice(0, 20);
}

function toEpoch(iso: string) {
  return Number.isNaN(Date.parse(iso)) ? 0 : Date.parse(iso);
}

function normalizeEvent(event: AgentActivityEvent): AgentActivityEvent {
  return {
    ...event,
    title: event.title.trim(),
    detail: event.detail?.trim() || undefined,
    filePaths: normalizeFilePaths(event.filePaths),
    outputPreview: event.outputPreview?.trim().slice(0, 4000) || undefined,
    metadata: event.metadata && Object.keys(event.metadata).length > 0 ? event.metadata : undefined,
    createdAt: event.createdAt || new Date().toISOString()
  };
}

function sortEvents(events: AgentActivityEvent[]) {
  return [...events].sort((left, right) => toEpoch(right.createdAt) - toEpoch(left.createdAt));
}

function readStoredEvents(projectId: string): AgentActivityEvent[] {
  const path = storePath(projectId);
  if (!existsSync(path)) return [];
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as AgentActivityEvent[];
    if (!Array.isArray(parsed)) return [];
    return sortEvents(parsed.map(normalizeEvent));
  } catch {
    return [];
  }
}

function saveStoredEvents(projectId: string, events: AgentActivityEvent[]) {
  mkdirSync(root, { recursive: true });
  writeFileSync(storePath(projectId), JSON.stringify(sortEvents(events).slice(0, 300), null, 2), "utf8");
}

export function listAgentActivityEvents(projectId: string): AgentActivityEvent[] {
  return readStoredEvents(projectId);
}

export function upsertAgentActivityEvent(event: AgentActivityEvent): AgentActivityEvent {
  const nextEvent = normalizeEvent(event);
  const existing = readStoredEvents(event.projectId);
  const index = existing.findIndex((item) => item.id === nextEvent.id);
  if (index >= 0) {
    existing[index] = { ...existing[index], ...nextEvent };
  } else {
    existing.unshift(nextEvent);
  }
  saveStoredEvents(event.projectId, existing);
  return nextEvent;
}
