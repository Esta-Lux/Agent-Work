import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ModelMode, ProviderId, TaskRisk } from "@/lib/ai/providers";
import { getSupabaseServiceClient } from "@/lib/db/supabase";
import { memoryStore, upsertRecord } from "@/lib/persistence/memory-store";
import type { UsageEventRecord } from "@/lib/persistence/schema";

const usagePath = resolve(process.cwd(), ".bootrise", "admin", "usage-events.jsonl");

function ensureUsageLog() {
  mkdirSync(join(usagePath, ".."), { recursive: true });
  if (!existsSync(usagePath)) appendFileSync(usagePath, "", "utf8");
}

export async function recordUsageEvent(input: {
  orgId: string;
  userId: string;
  projectId: string;
  provider: ProviderId;
  model: string;
  mode: ModelMode;
  taskType: string;
  risk: TaskRisk;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
  creditsCharged: number;
  premiumCreditsCharged: number;
  status: UsageEventRecord["status"];
  failureReason?: string | null;
}): Promise<UsageEventRecord> {
  const record: UsageEventRecord = {
    id: `usage_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    failureReason: input.failureReason ?? null,
    ...input
  };

  upsertRecord(memoryStore.usageEvents, record);
  appendLocalUsage(record);
  await persistCloudUsage(record);
  return record;
}

export async function listUsageEvents(input?: {
  orgId?: string;
  userId?: string;
  projectId?: string;
  limit?: number;
}): Promise<UsageEventRecord[]> {
  const supabase = getSupabaseServiceClient();
  if (supabase) {
    let query = supabase.from("bootrise_usage_events").select("*").order("created_at", { ascending: false });
    if (input?.orgId) query = query.eq("org_id", input.orgId);
    if (input?.userId) query = query.eq("user_id", input.userId);
    if (input?.projectId) query = query.eq("project_id", input.projectId);
    const { data } = await query.limit(input?.limit ?? 250);
    if (data) return data.map(fromSnakeUsage);
  }

  return readLocalUsage()
    .filter((event) => !input?.orgId || event.orgId === input.orgId)
    .filter((event) => !input?.userId || event.userId === input.userId)
    .filter((event) => !input?.projectId || event.projectId === input.projectId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, input?.limit ?? 250);
}

export function summarizeUsage(events: UsageEventRecord[]) {
  const byProvider = new Map<string, { credits: number; cost: number; calls: number }>();
  const byProject = new Map<string, { credits: number; cost: number; calls: number }>();
  let credits = 0;
  let premiumCredits = 0;
  let cost = 0;

  for (const event of events) {
    if (event.status === "blocked" || event.status === "estimated") continue;
    credits += event.creditsCharged;
    premiumCredits += event.premiumCreditsCharged;
    cost += event.estimatedCostUsd;
    bump(byProvider, event.provider, event);
    bump(byProject, event.projectId, event);
  }

  return {
    calls: events.length,
    billableCalls: events.filter((event) => event.status !== "blocked" && event.status !== "estimated").length,
    credits,
    premiumCredits,
    estimatedCostUsd: Math.round(cost * 10_000) / 10_000,
    byProvider: [...byProvider.entries()].map(([provider, value]) => ({ provider, ...value })),
    byProject: [...byProject.entries()].map(([projectId, value]) => ({ projectId, ...value }))
  };
}

export function getCurrentMonthUsage(events: UsageEventRecord[], orgId: string, userId: string): UsageEventRecord[] {
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return events.filter(
    (event) =>
      event.orgId === orgId &&
      event.userId === userId &&
      event.createdAt.startsWith(month) &&
      event.status !== "blocked" &&
      event.status !== "estimated"
  );
}

function bump(
  map: Map<string, { credits: number; cost: number; calls: number }>,
  key: string,
  event: UsageEventRecord
) {
  const current = map.get(key) ?? { credits: 0, cost: 0, calls: 0 };
  current.credits += event.creditsCharged;
  current.cost = Math.round((current.cost + event.estimatedCostUsd) * 10_000) / 10_000;
  current.calls += 1;
  map.set(key, current);
}

function appendLocalUsage(record: UsageEventRecord) {
  ensureUsageLog();
  appendFileSync(usagePath, `${JSON.stringify(record)}\n`, "utf8");
}

function readLocalUsage(): UsageEventRecord[] {
  ensureUsageLog();
  const raw = readFileSync(usagePath, "utf8").trim();
  const local = raw
    ? raw
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as UsageEventRecord)
    : [];
  const merged = new Map([...local, ...memoryStore.usageEvents].map((event) => [event.id, event]));
  return [...merged.values()];
}

async function persistCloudUsage(record: UsageEventRecord) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return;
  await supabase.from("bootrise_usage_events").insert({
    id: record.id,
    org_id: record.orgId,
    user_id: record.userId,
    project_id: record.projectId,
    provider: record.provider,
    model: record.model,
    mode: record.mode,
    task_type: record.taskType,
    risk: record.risk,
    estimated_input_tokens: record.estimatedInputTokens,
    estimated_output_tokens: record.estimatedOutputTokens,
    estimated_cost_usd: record.estimatedCostUsd,
    credits_charged: record.creditsCharged,
    premium_credits_charged: record.premiumCreditsCharged,
    status: record.status,
    failure_reason: record.failureReason,
    created_at: record.createdAt
  });
}

function fromSnakeUsage(row: Record<string, any>): UsageEventRecord {
  return {
    id: row.id,
    orgId: row.org_id,
    userId: row.user_id,
    projectId: row.project_id,
    provider: row.provider,
    model: row.model,
    mode: row.mode,
    taskType: row.task_type,
    risk: row.risk,
    estimatedInputTokens: Number(row.estimated_input_tokens ?? 0),
    estimatedOutputTokens: Number(row.estimated_output_tokens ?? 0),
    estimatedCostUsd: Number(row.estimated_cost_usd ?? 0),
    creditsCharged: Number(row.credits_charged ?? 0),
    premiumCreditsCharged: Number(row.premium_credits_charged ?? 0),
    status: row.status,
    failureReason: row.failure_reason,
    createdAt: row.created_at
  };
}
