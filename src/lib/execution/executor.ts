import type { ChangePlan, ExecutionLog, ExecutionResult } from "@/lib/types/core";

export function createDryRunExecutionResult(plan: ChangePlan): ExecutionResult {
  const logs = createExecutionLogs(plan);

  return {
    planId: plan.id,
    completedStepIds: plan.steps.map((step) => step.id),
    changedFiles: plan.steps.flatMap((step) => step.targetFiles),
    notes: [
      "Approved dry run completed. No repository files were mutated.",
      "Execution workers require explicit approval before applying planned edits."
    ],
    logs
  };
}

export function summarizeExecutionOrder(plan: ChangePlan): string[] {
  return plan.steps.map((step) => `${step.id}: ${step.title}`);
}

function createExecutionLogs(plan: ChangePlan): ExecutionLog[] {
  return plan.steps.map((step, index) => ({
    id: `log_${plan.id}_${index + 1}`,
    worker: step.domain,
    message: `${step.domain} worker completed: ${step.summary}`,
    status: "completed",
    createdAt: new Date().toISOString()
  }));
}
