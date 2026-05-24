import type { ChangePlan, ExecutionResult } from "@/lib/types/core";

export function createDryRunExecutionResult(plan: ChangePlan): ExecutionResult {
  return {
    planId: plan.id,
    completedStepIds: [],
    changedFiles: [],
    notes: [
      "Dry run only. No files were changed.",
      "Execution workers require explicit approval before applying planned edits."
    ]
  };
}

export function summarizeExecutionOrder(plan: ChangePlan): string[] {
  return plan.steps.map((step) => `${step.id}: ${step.title}`);
}

