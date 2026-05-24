import type { VerificationCheck } from "@/lib/types/core";

export function markChecksSkipped(checks: VerificationCheck[], reason: string): VerificationCheck[] {
  return checks.map((check) => ({
    ...check,
    status: "skipped",
    notes: reason
  }));
}

export function hasBlockingVerificationFailure(checks: VerificationCheck[]): boolean {
  return checks.some((check) => check.status === "failed" && check.kind !== "performance");
}

