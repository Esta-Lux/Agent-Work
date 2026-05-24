import type { ChangePlan, ChangeReport, ExecutionResult, VerificationCheck } from "@/lib/types/core";

export function createChangeReport(
  plan: ChangePlan,
  execution: ExecutionResult,
  verification: VerificationCheck[]
): ChangeReport {
  const failed = verification.filter((check) => check.status === "failed");
  const skipped = verification.filter((check) => check.status === "skipped");

  return {
    plan,
    execution,
    verification,
    summary: `${plan.intent.interpretedGoal} Planned ${plan.steps.length} steps across ${plan.impact.files.length} files.`,
    residualRisk: [
      ...failed.map((check) => `Failed validation: ${check.title}`),
      ...skipped.map((check) => `Skipped validation: ${check.title}`)
    ]
  };
}

