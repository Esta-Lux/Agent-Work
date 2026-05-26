import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";

export interface TaskSessionRecord {
  taskKey: string;
  repositoryId: string;
  requestPreview: string;
  failedPatchAttempts: number;
  totalAttempts: number;
  lastBlockedAt: string | null;
  updatedAt: string;
}

const sessionRoot = resolve(process.cwd(), ".bootrise", "control", "sessions");

function sessionPath(taskKey: string): string {
  return join(sessionRoot, `${taskKey}.json`);
}

export function buildTaskKey(repositoryId: string, request: string): string {
  const hash = createHash("sha256").update(`${repositoryId}::${request.trim().toLowerCase()}`).digest("hex");
  return hash.slice(0, 24);
}

export function loadTaskSession(taskKey: string): TaskSessionRecord | null {
  const path = sessionPath(taskKey);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as TaskSessionRecord;
  } catch {
    return null;
  }
}

export function recordPatchAttempt(input: {
  repositoryId: string;
  request: string;
  blocked: boolean;
}): TaskSessionRecord {
  mkdirSync(sessionRoot, { recursive: true });
  const taskKey = buildTaskKey(input.repositoryId, input.request);
  const existing =
    loadTaskSession(taskKey) ??
    ({
      taskKey,
      repositoryId: input.repositoryId,
      requestPreview: input.request.slice(0, 120),
      failedPatchAttempts: 0,
      totalAttempts: 0,
      lastBlockedAt: null,
      updatedAt: new Date().toISOString()
    } satisfies TaskSessionRecord);

  existing.totalAttempts += 1;
  if (input.blocked) {
    existing.failedPatchAttempts += 1;
    existing.lastBlockedAt = new Date().toISOString();
  }
  existing.updatedAt = new Date().toISOString();

  writeFileSync(sessionPath(taskKey), JSON.stringify(existing, null, 2), "utf8");
  return existing;
}

export function clearTaskSession(taskKey: string): void {
  const path = sessionPath(taskKey);
  if (existsSync(path)) writeFileSync(path, "", "utf8");
}

export function getFailedAttemptCount(repositoryId: string, request: string): number {
  const taskKey = buildTaskKey(repositoryId, request);
  return loadTaskSession(taskKey)?.failedPatchAttempts ?? 0;
}
