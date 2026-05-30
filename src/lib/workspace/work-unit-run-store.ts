import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { WorkUnitPlan } from "@/lib/workspace/work-unit-planner";
import type { MultiPassExecutionResult } from "@/lib/workspace/work-unit-state";

export interface WorkUnitRunRecord {
  id: string;
  orgId: string;
  projectId: string;
  repositoryId?: string;
  taskDescription: string;
  workUnitPlan: WorkUnitPlan;
  repoFiles: SourceFileInput[];
  result: MultiPassExecutionResult;
  createdAt: string;
  updatedAt: string;
}

const STORE_ROOT = resolve(process.cwd(), ".bootrise", "workspace");
const STORE_FILE = join(STORE_ROOT, "work-unit-runs.jsonl");
const cache = new Map<string, WorkUnitRunRecord>();
let initialized = false;

function ensureStore(): void {
  mkdirSync(STORE_ROOT, { recursive: true });
  if (!existsSync(STORE_FILE)) {
    appendFileSync(STORE_FILE, "", "utf8");
  }
}

function loadCache(): void {
  if (initialized) return;
  ensureStore();
  const raw = readFileSync(STORE_FILE, "utf8").trim();
  if (raw) {
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line) as WorkUnitRunRecord;
        cache.set(row.id, row);
      } catch {
        continue;
      }
    }
  }
  initialized = true;
}

function writeRecord(record: WorkUnitRunRecord): void {
  ensureStore();
  appendFileSync(STORE_FILE, `${JSON.stringify(record)}\n`, "utf8");
}

export function createWorkUnitRun(input: {
  orgId: string;
  projectId: string;
  repositoryId?: string;
  taskDescription: string;
  workUnitPlan: WorkUnitPlan;
  repoFiles: SourceFileInput[];
  result: MultiPassExecutionResult;
}): WorkUnitRunRecord {
  loadCache();
  const now = new Date().toISOString();
  const record: WorkUnitRunRecord = {
    id: `wur_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    orgId: input.orgId,
    projectId: input.projectId,
    repositoryId: input.repositoryId,
    taskDescription: input.taskDescription,
    workUnitPlan: input.workUnitPlan,
    repoFiles: input.repoFiles,
    result: input.result,
    createdAt: now,
    updatedAt: now
  };
  cache.set(record.id, record);
  writeRecord(record);
  return record;
}

export function getWorkUnitRun(id: string, orgId: string): WorkUnitRunRecord | null {
  loadCache();
  const run = cache.get(id);
  if (!run || run.orgId !== orgId) return null;
  return run;
}

export function updateWorkUnitRunResult(id: string, orgId: string, result: MultiPassExecutionResult): WorkUnitRunRecord | null {
  loadCache();
  const current = cache.get(id);
  if (!current || current.orgId !== orgId) return null;
  const updated: WorkUnitRunRecord = {
    ...current,
    result,
    updatedAt: new Date().toISOString()
  };
  cache.set(id, updated);
  writeRecord(updated);
  return updated;
}
