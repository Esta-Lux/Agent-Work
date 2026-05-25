import { getSupabaseServiceClient } from "@/lib/db/supabase";
import { memoryStore, upsertRecord } from "@/lib/persistence/memory-store";
import type { AdminTelemetryRecord } from "@/lib/persistence/schema";

export interface CreateAdminTelemetryInput {
  userId: string;
  projectId: string;
  sessionId: string;
  planningDurationMs: number;
  executionDurationMs: number;
  verificationDurationMs: number;
  selfHealingAttemptsCount?: number;
  finalOutcome: AdminTelemetryRecord["finalOutcome"];
  stallingErrorLogs?: string | null;
  tokenComputeCost?: number;
}

export interface AdminTelemetrySummary {
  activeSessions: number;
  fleetRunning: number;
  totalCommittedDiffs: number;
  firstPassSuccessRate: number;
  averageTimeToPlanMs: number;
  averageTimeToVerifyMs: number;
  averageComputeCost: number;
  hardFailures: AdminTelemetryRecord[];
  frictionPoints: string[];
}

export async function recordAdminTelemetry(input: CreateAdminTelemetryInput): Promise<AdminTelemetryRecord> {
  const record: AdminTelemetryRecord = {
    id: `telemetry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: input.userId,
    projectId: input.projectId,
    sessionId: input.sessionId,
    planningDurationMs: input.planningDurationMs,
    executionDurationMs: input.executionDurationMs,
    verificationDurationMs: input.verificationDurationMs,
    selfHealingAttemptsCount: input.selfHealingAttemptsCount ?? 0,
    finalOutcome: input.finalOutcome,
    stallingErrorLogs: input.stallingErrorLogs ?? null,
    tokenComputeCost: input.tokenComputeCost ?? 0,
    createdAt: new Date().toISOString()
  };

  upsertRecord(memoryStore.adminTelemetry, record);

  const supabase = getSupabaseServiceClient();
  if (supabase) {
    await supabase.from("bootrise_admin_telemetry").insert({
      id: record.id,
      user_id: record.userId,
      project_id: record.projectId,
      session_id: record.sessionId,
      planning_duration_ms: record.planningDurationMs,
      execution_duration_ms: record.executionDurationMs,
      verification_duration_ms: record.verificationDurationMs,
      self_healing_attempts_count: record.selfHealingAttemptsCount,
      final_outcome: record.finalOutcome,
      stalling_error_logs: record.stallingErrorLogs,
      token_compute_cost: record.tokenComputeCost,
      created_at: record.createdAt
    });
  }

  return record;
}

export async function getAdminTelemetry(limit = 100): Promise<AdminTelemetryRecord[]> {
  const supabase = getSupabaseServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from("bootrise_admin_telemetry")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (data) {
      return data.map((row) => ({
        id: row.id,
        userId: row.user_id,
        projectId: row.project_id,
        sessionId: row.session_id,
        planningDurationMs: row.planning_duration_ms,
        executionDurationMs: row.execution_duration_ms,
        verificationDurationMs: row.verification_duration_ms,
        selfHealingAttemptsCount: row.self_healing_attempts_count,
        finalOutcome: row.final_outcome,
        stallingErrorLogs: row.stalling_error_logs,
        tokenComputeCost: Number(row.token_compute_cost ?? 0),
        createdAt: row.created_at
      }));
    }
  }

  return memoryStore.adminTelemetry.slice(-limit).reverse();
}

export function summarizeAdminTelemetry(records: AdminTelemetryRecord[]): AdminTelemetrySummary {
  const committed = records.filter((record) => record.finalOutcome === "COMMITTED");
  const firstPass = records.filter(
    (record) => record.finalOutcome === "COMMITTED" && record.selfHealingAttemptsCount === 0
  );
  const hardFailures = records.filter((record) => record.finalOutcome === "HARD_CRASH").slice(0, 6);
  const activeSessions = new Set(records.slice(0, 12).map((record) => record.sessionId)).size;

  return {
    activeSessions,
    fleetRunning: records.filter((record) => record.finalOutcome !== "ABANDONED").slice(0, 8).length,
    totalCommittedDiffs: committed.length,
    firstPassSuccessRate: committed.length > 0 ? Math.round((firstPass.length / committed.length) * 100) : 0,
    averageTimeToPlanMs: average(records.map((record) => record.planningDurationMs)),
    averageTimeToVerifyMs: average(records.map((record) => record.verificationDurationMs)),
    averageComputeCost: Number(averagePrecise(records.map((record) => record.tokenComputeCost)).toFixed(4)),
    hardFailures,
    frictionPoints: deriveFrictionPoints(records)
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function averagePrecise(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function deriveFrictionPoints(records: AdminTelemetryRecord[]): string[] {
  const sources = records
    .filter((record) => record.selfHealingAttemptsCount > 0 || record.finalOutcome === "HARD_CRASH")
    .map((record) => record.stallingErrorLogs)
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

  const points = [];
  if (sources.includes("type")) points.push("Type contracts caused the most recovery pressure.");
  if (sources.includes("route")) points.push("Route handlers need stronger API contract snapshots.");
  if (sources.includes("schema")) points.push("Schema changes should require migration preview evidence.");
  if (points.length === 0) points.push("No repeated friction pattern has crossed the alert threshold.");

  return points;
}
