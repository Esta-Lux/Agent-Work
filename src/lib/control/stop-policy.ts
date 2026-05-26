import type { ScopeContract, PatchGuardResult } from "@/lib/control/types";
import { getFailedAttemptCount, recordPatchAttempt } from "@/lib/control/task-session";

const SECURITY_PATTERNS = [
  /eval\s*\(/,
  /child_process/,
  /disable.*auth/i,
  /bypass.*auth/i,
  /process\.env\.\w+\s*=\s*["']/
];

export interface StopPolicyResult {
  shouldStop: boolean;
  reason: string | null;
  failedAttempts: number;
}

export function evaluateStopPolicy(input: {
  request: string;
  scopeContract: ScopeContract;
  patchGuard: PatchGuardResult;
  repositoryId?: string;
  patches: Array<{ after: string }>;
  recordAttempt?: boolean;
}): StopPolicyResult {
  const reasons: string[] = [];

  const failedAttempts = input.repositoryId
    ? getFailedAttemptCount(input.repositoryId, input.request)
    : 0;

  if (failedAttempts >= 2) {
    reasons.push(
      `Stopped after ${failedAttempts} failed patch attempts on this task — refine scope or split before retrying.`
    );
  }

  if (input.scopeContract.confidence < 0.5) {
    reasons.push("Low scope confidence — name the file or behavior to change.");
  }

  const trimmed = input.request.trim();
  if (trimmed.length < 12 && input.scopeContract.allowedEditFiles.length === 0) {
    reasons.push("Task is too ambiguous — add which screen, API, or file should change.");
  }

  if (
    input.scopeContract.requiresApprovalFor.length > 0 &&
    !/\b(approve|expand scope|auth|billing|migration)\b/i.test(input.request)
  ) {
    reasons.push(
      `Change touches ${input.scopeContract.requiresApprovalFor.join(", ")} — approve scope expansion before proceeding.`
    );
  }

  if (input.patchGuard.blocked) {
    const top = input.patchGuard.findings.find((f) => f.severity === "block");
    if (top) reasons.push(top.message);
  }

  for (const patch of input.patches) {
    if (SECURITY_PATTERNS.some((re) => re.test(patch.after))) {
      reasons.push("Security risk detected in proposed patch — manual review required.");
      break;
    }
  }

  const unique = [...new Set(reasons)];
  const shouldStop = unique.length > 0;

  if (input.recordAttempt && input.repositoryId) {
    recordPatchAttempt({
      repositoryId: input.repositoryId,
      request: input.request,
      blocked: shouldStop
    });
  }

  return {
    shouldStop,
    reason: unique[0] ?? null,
    failedAttempts: input.repositoryId
      ? getFailedAttemptCount(input.repositoryId, input.request)
      : failedAttempts
  };
}
