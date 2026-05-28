import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { listAllProjectsAdmin, type WorkspaceProject } from "@/lib/workspace/project-store";
import { listRuntimeEvents, type RuntimeEvent } from "@/lib/runtime/runtime-events";
import { listUsageEvents, summarizeUsage } from "@/lib/usage/usage-store";
import { memoryStore } from "@/lib/persistence/memory-store";
import type { BootriseJob } from "@/lib/jobs/job-types";
import type { PendingFixRecord, PendingFixStatus } from "@/lib/workspace/pending-fix-store";
import type { SandboxRunRecord, UsageEventRecord } from "@/lib/persistence/schema";

const BOOTRISE_ROOT = () => resolve(process.cwd(), ".bootrise");

export interface ProjectSummary {
  id: string;
  name: string;
  orgId: string;
  fileCount: number;
  preferredProvider: string;
  repositoryId?: string;
  githubUrl?: string;
  lastReportStatus?: string;
  updatedAt: string;
}

export interface PendingFixSummary {
  id: string;
  repositoryId: string;
  status: PendingFixStatus;
  request: string;
  filesChanged: number;
  riskLevel?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface RuntimeProjectCluster {
  projectId: string;
  events: RuntimeEvent[];
  totalCount: number;
}

export interface JobSummary {
  id: string;
  type: string;
  status: string;
  projectId: string;
  orgId: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsageBreakdown {
  totals: ReturnType<typeof summarizeUsage>;
  byUser: Array<{ userId: string; calls: number; credits: number; cost: number }>;
  byModel: Array<{ model: string; calls: number; credits: number; cost: number }>;
  byMode: Array<{ mode: string; calls: number; credits: number; cost: number }>;
  byTaskType: Array<{ taskType: string; calls: number; credits: number; cost: number }>;
  byStatus: Array<{ status: string; calls: number }>;
}

export async function listProjectsAdmin(limit = 100): Promise<ProjectSummary[]> {
  const projects = await listAllProjectsAdmin();
  return projects.slice(0, limit).map((p: WorkspaceProject) => ({
    id: p.id,
    name: p.name,
    orgId: (p as { orgId?: string }).orgId ?? "org_default",
    fileCount: Array.isArray(p.files) ? p.files.length : 0,
    preferredProvider: (p as { preferredProvider?: string }).preferredProvider ?? "bootrise",
    repositoryId: (p as { repositoryId?: string }).repositoryId,
    githubUrl: (p as { githubUrl?: string }).githubUrl,
    lastReportStatus: (p as { lastReport?: { status?: string } }).lastReport?.status,
    updatedAt: (p as { updatedAt?: string }).updatedAt ?? new Date().toISOString()
  }));
}

export function listPendingFixesAdmin(limit = 100): PendingFixSummary[] {
  const root = join(BOOTRISE_ROOT(), "pending-fixes");
  if (!existsSync(root)) return [];
  const out: PendingFixSummary[] = [];
  for (const id of readdirSync(root)) {
    const metaPath = join(root, id, "meta.json");
    if (!existsSync(metaPath)) continue;
    try {
      const meta = JSON.parse(readFileSync(metaPath, "utf8")) as Omit<PendingFixRecord, "filesSnapshot" | "patches">;
      let filesChanged = 0;
      try {
        const patches = JSON.parse(readFileSync(join(root, id, "patches.json"), "utf8")) as unknown[];
        filesChanged = Array.isArray(patches) ? patches.length : 0;
      } catch {
        /* ignore */
      }
      out.push({
        id: meta.id,
        repositoryId: meta.repositoryId,
        status: meta.status,
        request: typeof meta.request === "string" ? meta.request.slice(0, 200) : "",
        filesChanged,
        riskLevel: meta.plan?.risk?.level,
        createdAt: meta.createdAt,
        resolvedAt: meta.resolvedAt
      });
    } catch {
      /* skip corrupt records */
    }
  }
  out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return out.slice(0, limit);
}

export function listRuntimeClustersAdmin(): RuntimeProjectCluster[] {
  const root = join(BOOTRISE_ROOT(), "runtime");
  if (!existsSync(root)) return [];
  const out: RuntimeProjectCluster[] = [];
  for (const file of readdirSync(root)) {
    if (!file.endsWith(".json")) continue;
    const projectId = file.replace(/\.json$/, "");
    const events = listRuntimeEvents(projectId);
    if (!events.length) continue;
    out.push({
      projectId,
      events: events.slice(0, 20),
      totalCount: events.reduce((acc, e) => acc + e.count, 0)
    });
  }
  out.sort((a, b) => b.totalCount - a.totalCount);
  return out;
}

export function listJobsAdmin(limit = 100): JobSummary[] {
  const root = join(BOOTRISE_ROOT(), "jobs");
  if (!existsSync(root)) return [];
  const out: JobSummary[] = [];
  for (const file of readdirSync(root)) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = readFileSync(join(root, file), "utf8");
      const job = JSON.parse(raw) as BootriseJob;
      out.push({
        id: job.id,
        type: job.type,
        status: job.status,
        projectId: job.projectId,
        orgId: job.orgId,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      });
    } catch {
      /* ignore */
    }
  }
  out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return out.slice(0, limit);
}

export function listSandboxRunsAdmin(limit = 50): SandboxRunRecord[] {
  const runs = [...(memoryStore.sandboxRuns ?? [])];
  runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return runs.slice(0, limit);
}

function bucketBy<T extends { creditsCharged: number; estimatedCostUsd: number }>(
  events: T[],
  key: (e: T) => string
): Array<{ key: string; calls: number; credits: number; cost: number }> {
  const map = new Map<string, { calls: number; credits: number; cost: number }>();
  for (const e of events) {
    const k = key(e) || "(unknown)";
    const cur = map.get(k) ?? { calls: 0, credits: 0, cost: 0 };
    cur.calls += 1;
    cur.credits += Number(e.creditsCharged) || 0;
    cur.cost += Number(e.estimatedCostUsd) || 0;
    map.set(k, cur);
  }
  return Array.from(map.entries())
    .map(([k, v]) => ({ key: k, ...v }))
    .sort((a, b) => b.cost - a.cost);
}

export async function listUsageBreakdownAdmin(opts?: {
  orgId?: string;
  projectId?: string;
  limit?: number;
}): Promise<UsageBreakdown> {
  const events: UsageEventRecord[] = await listUsageEvents({
    orgId: opts?.orgId,
    projectId: opts?.projectId,
    limit: opts?.limit ?? 1000
  });
  const totals = summarizeUsage(events);
  const byUser = bucketBy(events, (e) => e.userId).map(({ key, ...rest }) => ({ userId: key, ...rest }));
  const byModel = bucketBy(events, (e) => e.model).map(({ key, ...rest }) => ({ model: key, ...rest }));
  const byMode = bucketBy(events, (e) => e.mode).map(({ key, ...rest }) => ({ mode: key, ...rest }));
  const byTaskType = bucketBy(events, (e) => e.taskType).map(({ key, ...rest }) => ({ taskType: key, ...rest }));
  const statusMap = new Map<string, number>();
  for (const e of events) statusMap.set(e.status, (statusMap.get(e.status) ?? 0) + 1);
  const byStatus = Array.from(statusMap.entries())
    .map(([status, calls]) => ({ status, calls }))
    .sort((a, b) => b.calls - a.calls);
  return { totals, byUser, byModel, byMode, byTaskType, byStatus };
}
