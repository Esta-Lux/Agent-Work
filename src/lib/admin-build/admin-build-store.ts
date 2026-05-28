import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { getSupabaseServiceClient } from "@/lib/db/supabase";
import { recordAudit } from "@/lib/admin/audit-log";
import type {
  AdminBuildMission,
  AdminBuildEvent,
  CreateAdminBuildMissionInput,
  UpdateAdminBuildMissionInput
} from "./types";

const STORE_ROOT = resolve(process.cwd(), ".bootrise", "admin", "build-missions");
const STORE_FILE = join(STORE_ROOT, "missions.jsonl");

const memoryCache = new Map<string, AdminBuildMission>();
let cacheInitialized = false;

function ensureStore(): void {
  mkdirSync(STORE_ROOT, { recursive: true });
  if (!existsSync(STORE_FILE)) {
    appendFileSync(STORE_FILE, "", "utf8");
  }
}

function generateId(): string {
  return `bm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function readRows(): AdminBuildMission[] {
  if (!existsSync(STORE_FILE)) return [];
  const raw = readFileSync(STORE_FILE, "utf8").trim();
  if (!raw) return [];
  const rows: AdminBuildMission[] = [];
  for (const line of raw.split("\n").filter(Boolean)) {
    try {
      rows.push(JSON.parse(line) as AdminBuildMission);
    } catch {
      continue;
    }
  }
  return rows;
}

function materialize(rows: AdminBuildMission[]): AdminBuildMission[] {
  const byId = new Map<string, AdminBuildMission>();
  for (const row of rows) {
    byId.set(row.id, row);
  }
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function initCache(): void {
  if (cacheInitialized) return;
  const rows = materialize(readRows());
  for (const row of rows) {
    memoryCache.set(row.id, row);
  }
  cacheInitialized = true;
}

function getSupabaseTableName(): string {
  return "admin_build_missions";
}

async function isSupabaseTableReady(): Promise<boolean> {
  const client = getSupabaseServiceClient();
  if (!client) return false;
  try {
    const { error } = await client
      .from(getSupabaseTableName())
      .select("id", { count: "exact", head: true })
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}

async function persistToSupabase(mission: AdminBuildMission, orgId?: string): Promise<void> {
  if (!(await isSupabaseTableReady())) return;
  const client = getSupabaseServiceClient();
  if (!client) return;

  try {
    const row = {
      id: mission.id,
      title: mission.title,
      target_surface: mission.targetSurface,
      objective: mission.objective,
      affected_files: mission.affectedFiles,
      forbidden_files: mission.forbiddenFiles,
      acceptance_criteria: mission.acceptanceCriteria,
      risk_level: mission.riskLevel,
      status: mission.status,
      created_at: mission.createdAt,
      updated_at: mission.updatedAt,
      created_by: mission.createdBy,
      generated_from: mission.generatedFrom,
      patch_preview_id: mission.patchPreviewId ?? null,
      pr_url: mission.prUrl ?? null,
      branch_name: mission.branchName ?? null,
      org_id: orgId ?? "org_default"
    };

    const { error } = await client.from(getSupabaseTableName()).upsert(row, { onConflict: "id" });
    if (error) {
      console.warn("[AdminBuild] Supabase upsert failed:", error.message);
    }
  } catch (err) {
    console.warn("[AdminBuild] Supabase persistence error:", err);
  }
}

export function createAdminBuildMission(
  input: CreateAdminBuildMissionInput,
  userId: string,
  orgId?: string
): AdminBuildMission {
  ensureStore();
  initCache();

  const now = new Date().toISOString();
  const mission: AdminBuildMission = {
    id: generateId(),
    title: input.title,
    targetSurface: input.targetSurface,
    objective: input.objective,
    affectedFiles: input.affectedFiles ?? [],
    forbiddenFiles: input.forbiddenFiles ?? [
      "src/lib/auth/**",
      "src/app/api/auth/**",
      "src/lib/db/migrations/**",
      "src/lib/ai/model-router.ts",
      "src/lib/admin/kill-switches.ts"
    ],
    acceptanceCriteria: input.acceptanceCriteria ?? [],
    riskLevel: input.riskLevel ?? "medium",
    status: "draft",
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    generatedFrom: input.generatedFrom ?? "manual",
    events: [
      {
        id: generateEventId(),
        type: "draft",
        message: "Mission created",
        timestamp: now
      }
    ]
  };

  appendFileSync(STORE_FILE, `${JSON.stringify(mission)}\n`, "utf8");
  memoryCache.set(mission.id, mission);

  void persistToSupabase(mission, orgId);
  void recordAudit(
    {
      actor: userId,
      action: "admin_build.mission_created",
      detail: `${mission.title} (${mission.targetSurface})`,
      metadata: {
        missionId: mission.id,
        targetSurface: mission.targetSurface,
        riskLevel: mission.riskLevel,
        generatedFrom: mission.generatedFrom ?? "manual"
      }
    },
    orgId
  );

  return mission;
}

export function listAdminBuildMissions(options?: { limit?: number; status?: string }): AdminBuildMission[] {
  initCache();
  let missions = [...memoryCache.values()];

  if (options?.status) {
    missions = missions.filter((m) => m.status === options.status);
  }

  missions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return missions.slice(0, options?.limit ?? 100);
}

export function getAdminBuildMission(id: string): AdminBuildMission | undefined {
  initCache();
  return memoryCache.get(id);
}

export function updateAdminBuildMission(
  id: string,
  input: UpdateAdminBuildMissionInput,
  actor: string,
  orgId?: string
): AdminBuildMission | undefined {
  initCache();
  const current = memoryCache.get(id) ?? materialize(readRows()).find((m) => m.id === id);
  if (!current) return undefined;

  const now = new Date().toISOString();
  const updated: AdminBuildMission = {
    ...current,
    title: input.title ?? current.title,
    objective: input.objective ?? current.objective,
    affectedFiles: input.affectedFiles ?? current.affectedFiles,
    forbiddenFiles: input.forbiddenFiles ?? current.forbiddenFiles,
    acceptanceCriteria: input.acceptanceCriteria ?? current.acceptanceCriteria,
    riskLevel: input.riskLevel ?? current.riskLevel,
    status: input.status ?? current.status,
    updatedAt: now,
    patchPreviewId: input.patchPreviewId ?? current.patchPreviewId,
    prUrl: input.prUrl ?? current.prUrl,
    branchName: input.branchName ?? current.branchName,
    scopeContract: input.scopeContract ?? current.scopeContract,
    guardResults: input.guardResults ?? current.guardResults,
    events: current.events ?? []
  };

  if (input.status && input.status !== current.status) {
    updated.events = [
      ...(updated.events ?? []),
      {
        id: generateEventId(),
        type: input.status,
        message: `Status changed to ${input.status}`,
        timestamp: now,
        metadata: { previousStatus: current.status }
      }
    ];
  }

  ensureStore();
  appendFileSync(STORE_FILE, `${JSON.stringify(updated)}\n`, "utf8");
  memoryCache.set(updated.id, updated);

  void persistToSupabase(updated, orgId);
  void recordAudit(
    {
      actor,
      action: "admin_build.mission_updated",
      detail: `${updated.title} → ${updated.status}`,
      metadata: {
        missionId: updated.id,
        status: updated.status,
        riskLevel: updated.riskLevel
      }
    },
    orgId
  );

  return updated;
}

export function appendMissionEvent(
  missionId: string,
  message: string,
  type: string,
  actor: string,
  orgId?: string,
  metadata?: Record<string, string | number | boolean>
): AdminBuildMission | undefined {
  const current = getAdminBuildMission(missionId);
  if (!current) return undefined;

  const now = new Date().toISOString();
  const event: AdminBuildEvent = {
    id: generateEventId(),
    type: type as any,
    message,
    timestamp: now,
    metadata
  };

  return updateAdminBuildMission(
    missionId,
    {
      events: [...(current.events ?? []), event]
    },
    actor,
    orgId
  );
}

export async function loadMissionsFromSupabase(orgId: string = "org_default"): Promise<AdminBuildMission[]> {
  if (!(await isSupabaseTableReady())) return [];
  const client = getSupabaseServiceClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from(getSupabaseTableName())
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      title: row.title,
      targetSurface: row.target_surface,
      objective: row.objective,
      affectedFiles: row.affected_files ?? [],
      forbiddenFiles: row.forbidden_files ?? [],
      acceptanceCriteria: row.acceptance_criteria ?? [],
      riskLevel: row.risk_level,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      generatedFrom: row.generated_from,
      patchPreviewId: row.patch_preview_id ?? undefined,
      prUrl: row.pr_url ?? undefined,
      branchName: row.branch_name ?? undefined
    }));
  } catch {
    return [];
  }
}
