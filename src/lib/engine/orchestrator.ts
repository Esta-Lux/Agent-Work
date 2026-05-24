import { getSupabaseServiceClient } from "@/lib/db/supabase";
import { createRollbackSnapshot } from "@/lib/engine/rollback";
import { SandboxRuntime } from "@/lib/engine/sandbox-runtime";
import { createSelfHealingAttempt } from "@/lib/engine/self-healing";
import { VerificationEngine } from "@/lib/engine/verification-engine";
import { recordDynamicPulse } from "@/lib/memory/run-history";
import { memoryStore, upsertRecord } from "@/lib/persistence/memory-store";
import type { SandboxRunRecord } from "@/lib/persistence/schema";

export interface OrchestrationResult {
  success: boolean;
  actionRequired?: "SELF_HEALING_TRIGGERED";
  message?: string;
  logs: string;
  run: SandboxRunRecord;
  rollbackSnapshotId?: string;
  selfHealingAttemptId?: string;
}

export class BootRiseOrchestrator {
  private sandbox: SandboxRuntime;
  private verifier: VerificationEngine;

  constructor(private readonly repositoryId: string, private readonly repoPath: string) {
    this.sandbox = new SandboxRuntime(repoPath);
    this.verifier = new VerificationEngine(this.sandbox);
  }

  public async processChangePipeline(
    planId: string,
    filePath: string,
    targetFilePatch: string
  ): Promise<OrchestrationResult> {
    const executionId = `execution_${planId}_${Date.now()}`;
    const rollback = await createRollbackSnapshot({
      executionId,
      planId,
      repositoryId: this.repositoryId,
      repoPath: this.repoPath,
      filePaths: [filePath]
    });

    await this.recordSandboxRun(planId, "EXECUTING_IN_SANDBOX", "Initializing execution...", [filePath]);
    this.sandbox.writeFile(filePath, targetFilePatch);

    const report = await this.verifier.runFullVerification();
    const status = report.isValid ? "SUCCESS" : report.brokenStage === "COMPILE" ? "COMPILE_FAIL" : "TEST_FAIL";
    const run = await this.recordSandboxRun(planId, status, report.logs, [filePath]);
    await recordDynamicPulse({
      repositoryId: this.repositoryId,
      source: report.isValid ? "test" : "terminal",
      severity: report.isValid ? "info" : "error",
      summary: report.isValid ? "Sandbox verification succeeded." : `Sandbox verification failed at ${status}.`,
      rawPayload: {
        planId,
        filePath,
        status,
        logs: report.logs.slice(0, 2000)
      }
    });

    if (!report.isValid) {
      const healingAttempt = await createSelfHealingAttempt(run);
      return {
        success: false,
        actionRequired: "SELF_HEALING_TRIGGERED",
        logs: report.logs,
        run,
        rollbackSnapshotId: rollback.id,
        selfHealingAttemptId: healingAttempt.id
      };
    }

    return {
      success: true,
      message: "Code change verified and safely locked into state.",
      logs: report.logs,
      run,
      rollbackSnapshotId: rollback.id
    };
  }

  private async recordSandboxRun(
    planId: string,
    status: SandboxRunRecord["status"],
    terminalLogs: string,
    modifiedFiles: string[]
  ): Promise<SandboxRunRecord> {
    const now = new Date().toISOString();
    const run: SandboxRunRecord = {
      id: `sandbox_${planId}_${Date.now()}`,
      planId,
      repositoryId: this.repositoryId,
      status,
      terminalLogs,
      modifiedFiles,
      createdAt: now
    };

    upsertRecord(memoryStore.sandboxRuns, run);

    const supabase = getSupabaseServiceClient();
    if (supabase) {
      await supabase.from("bootrise_sandbox_runs").insert({
        plan_id: planId,
        repository_id: this.repositoryId,
        status,
        terminal_logs: terminalLogs,
        modified_files: modifiedFiles,
        created_at: now
      });
    }

    return run;
  }
}
