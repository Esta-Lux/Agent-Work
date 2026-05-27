import type { ChangePlan } from "@/lib/types/core";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";
import type { ControlLayerSummary } from "@/lib/control/types";
import { evaluateContextGate } from "@/lib/control/context-gate";
import { runControlGate } from "@/lib/control/control-gate";
import { runSecurityGuard } from "@/lib/security/security-guard";
import { appendLedgerEvent } from "@/lib/workspace/living-ledger-timeline";

export interface ControlOrchestratorInput {
  orgId: string;
  userId: string;
  projectId: string;
  repositoryId?: string;
  request: string;
  files: SourceFileInput[];
  plan: ChangePlan;
  patches: ProposedPatch[];
  assumptionsApproved?: boolean;
}

export interface ExtendedControlSummary extends ControlLayerSummary {
  canPatch: boolean;
  safeToPr: boolean;
  safeToDeploy: boolean;
  securityGuard: ReturnType<typeof runSecurityGuard>;
}

export async function runControlLayerBeforePatch(
  input: ControlOrchestratorInput
): Promise<ExtendedControlSummary> {
  const contextGate = evaluateContextGate({
    request: input.request,
    files: input.files,
    targetFiles: input.plan.impact.files,
    assumptionsApproved: input.assumptionsApproved
  });

  if (contextGate.status === "blocked") {
    return finalizeSummary(
      input,
      await runControlGate({
        request: input.request,
        plan: input.plan,
        files: input.files,
        patches: [],
        repositoryId: input.repositoryId,
        projectId: input.projectId,
        orgId: input.orgId
      }),
      false,
      contextGate.status
    );
  }

  if (contextGate.status === "needs_clarification" && !input.assumptionsApproved) {
    return finalizeSummary(
      input,
      await runControlGate({
        request: input.request,
        plan: input.plan,
        files: input.files,
        patches: [],
        repositoryId: input.repositoryId,
        projectId: input.projectId,
        orgId: input.orgId
      }),
      false,
      contextGate.status
    );
  }

  const summary = await runControlGate({
    request: input.request,
    plan: input.plan,
    files: input.files,
    patches: input.patches,
    repositoryId: input.repositoryId,
    projectId: input.projectId,
    orgId: input.orgId
  });

  return finalizeSummary(input, summary, input.patches.length > 0, contextGate.status);
}

async function finalizeSummary(
  input: ControlOrchestratorInput,
  base: ControlLayerSummary,
  allowPatches: boolean,
  _gateStatus: ControlLayerSummary["contextGate"]["status"]
): Promise<ExtendedControlSummary> {
  const securityGuard = runSecurityGuard({ files: input.files, patches: input.patches });
  const summary: ExtendedControlSummary = {
    ...base,
    securityGuard,
    canPatch: allowPatches && !base.patchGuard.blocked,
    safeToPr: base.canApprove && securityGuard.passed,
    safeToDeploy: base.canApprove && securityGuard.criticalCount === 0,
    canApply: base.canApprove && securityGuard.criticalCount === 0
  };

  if (securityGuard.criticalCount > 0) {
    summary.canApply = false;
    summary.stopReason = summary.stopReason ?? "Critical security findings block apply.";
  }

  try {
    await appendLedgerEvent(
      input.projectId,
      {
        kind: "fix_proposed",
        title: summary.canPatch ? "Control layer evaluated" : "Control layer blocked",
        narrative: summary.stopReason ?? summary.contextGate.reason,
        metadata: { canApprove: summary.canApprove, canPatch: summary.canPatch }
      },
      input.orgId
    );
  } catch {
    /* non-blocking */
  }

  return summary;
}
