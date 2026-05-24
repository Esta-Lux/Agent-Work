import { getSupabaseServiceClient } from "@/lib/db/supabase";
import { memoryStore, upsertRecord } from "@/lib/persistence/memory-store";
import type { SandboxRunRecord, SelfHealingAttemptRecord } from "@/lib/persistence/schema";

export async function createSelfHealingAttempt(run: SandboxRunRecord): Promise<SelfHealingAttemptRecord> {
  const diagnosis = diagnoseFailure(run);
  const record: SelfHealingAttemptRecord = {
    id: `heal_${run.planId}_${Date.now()}`,
    planId: run.planId,
    repositoryId: run.repositoryId,
    failedRunId: run.id,
    diagnosis,
    proposedActions: proposeActions(run, diagnosis),
    status: "proposed",
    createdAt: new Date().toISOString()
  };

  upsertRecord(memoryStore.selfHealingAttempts, record);

  const supabase = getSupabaseServiceClient();
  if (supabase) {
    await supabase.from("bootrise_self_healing_attempts").insert({
      id: record.id,
      plan_id: record.planId,
      repository_id: record.repositoryId,
      failed_run_id: record.failedRunId,
      diagnosis: record.diagnosis,
      proposed_actions: record.proposedActions,
      status: record.status,
      created_at: record.createdAt
    });
  }

  return record;
}

function diagnoseFailure(run: SandboxRunRecord): string {
  const logs = run.terminalLogs.toLowerCase();

  if (logs.includes("type") || logs.includes("typescript") || logs.includes("tsc")) {
    return "Compile/type failure detected in sandbox output.";
  }

  if (logs.includes("test") || logs.includes("expect") || logs.includes("assert")) {
    return "Test failure detected in sandbox output.";
  }

  return "Runtime or command failure detected. Human approval is required before applying a repair.";
}

function proposeActions(run: SandboxRunRecord, diagnosis: string): string[] {
  return [
    `Review ${run.modifiedFiles.length} modified file(s) before retrying.`,
    "Use the failed terminal logs as the only repair input.",
    diagnosis.includes("Compile") ? "Generate the smallest type-safe patch and rerun build." : "Generate the smallest behavioral patch and rerun tests.",
    "Do not commit repaired files until verification passes."
  ];
}

