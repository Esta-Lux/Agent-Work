import type { ControlLayerSummary } from "@/lib/control/types";
import { ControlBlockedError } from "@/lib/control/control-errors";

export function assertCanGeneratePatch(summary: ControlLayerSummary): void {
  if (summary.contextGate.status === "blocked") {
    throw new ControlBlockedError(summary.contextGate.reason);
  }
  if (summary.contextGate.status === "needs_clarification") {
    throw new ControlBlockedError("Clarification required before patch generation.");
  }
}

export function assertCanApprove(summary: ControlLayerSummary): void {
  if (!summary.canApprove) {
    throw new ControlBlockedError(summary.stopReason ?? "Control layer blocked approval.");
  }
}

export function assertCanApply(summary: ControlLayerSummary): void {
  if (!summary.canApply) {
    throw new ControlBlockedError(summary.stopReason ?? "Control layer blocked apply.");
  }
}
