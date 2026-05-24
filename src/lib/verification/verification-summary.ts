import type { ChangePlan, VerificationCheck } from "@/lib/types/core";

export interface VerificationSummary {
  total: number;
  pending: number;
  blocking: number;
  commands: string[];
  checks: VerificationCheck[];
}

export function createVerificationSummary(plan: ChangePlan): VerificationSummary {
  return {
    total: plan.validations.length,
    pending: plan.validations.filter((check) => check.status === "pending").length,
    blocking: plan.validations.filter((check) => check.kind !== "performance").length,
    commands: plan.validations.flatMap((check) => (check.command ? [check.command] : [])),
    checks: plan.validations
  };
}

