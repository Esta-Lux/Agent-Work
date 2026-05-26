import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export interface RuntimeEvent {
  id: string;
  projectId: string;
  message: string;
  normalizedKey: string;
  count: number;
  likelyFiles: string[];
  firstSeen: string;
  lastSeen: string;
}

const root = resolve(process.cwd(), ".bootrise", "runtime");

function storePath(projectId: string) {
  return join(root, `${projectId}.json`);
}

export function listRuntimeEvents(projectId: string): RuntimeEvent[] {
  const path = storePath(projectId);
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, "utf8")) as RuntimeEvent[];
  } catch {
    return [];
  }
}

export function recordRuntimeEvent(input: {
  projectId: string;
  message: string;
  likelyFiles?: string[];
}): RuntimeEvent {
  const key = input.message.replace(/\d+/g, "N").slice(0, 200);
  const events = listRuntimeEvents(input.projectId);
  const existing = events.find((e) => e.normalizedKey === key);
  const now = new Date().toISOString();

  if (existing) {
    existing.count += 1;
    existing.lastSeen = now;
    if (input.likelyFiles?.length) {
      existing.likelyFiles = Array.from(new Set([...existing.likelyFiles, ...input.likelyFiles])).slice(0, 8);
    }
  } else {
    events.unshift({
      id: `rt_${Date.now()}`,
      projectId: input.projectId,
      message: input.message,
      normalizedKey: key,
      count: 1,
      likelyFiles: input.likelyFiles ?? [],
      firstSeen: now,
      lastSeen: now
    });
  }

  mkdirSync(root, { recursive: true });
  writeFileSync(storePath(input.projectId), JSON.stringify(events.slice(0, 100), null, 2), "utf8");
  return existing ?? events[0]!;
}
