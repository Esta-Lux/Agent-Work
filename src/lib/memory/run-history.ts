import { getSupabaseServiceClient } from "@/lib/db/supabase";
import { memoryStore, upsertRecord } from "@/lib/persistence/memory-store";
import type { DynamicPulseRecord, SandboxRunRecord } from "@/lib/persistence/schema";

export function getLastSandboxRuns(limit = 100): SandboxRunRecord[] {
  return [...memoryStore.sandboxRuns]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);
}

export function getLastDynamicPulses(limit = 100): DynamicPulseRecord[] {
  return [...memoryStore.dynamicPulses]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);
}

export async function recordDynamicPulse(
  pulse: Omit<DynamicPulseRecord, "id" | "createdAt">
): Promise<DynamicPulseRecord> {
  const now = new Date().toISOString();
  const record: DynamicPulseRecord = {
    ...pulse,
    id: `pulse_${Date.now()}`,
    createdAt: now
  };

  upsertRecord(memoryStore.dynamicPulses, record);

  const supabase = getSupabaseServiceClient();
  if (supabase) {
    await supabase.from("bootrise_dynamic_pulses").insert({
      repository_id: record.repositoryId,
      source: record.source,
      severity: record.severity,
      summary: record.summary,
      raw_payload: record.rawPayload,
      created_at: record.createdAt
    });
  }

  return record;
}

