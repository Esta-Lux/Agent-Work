import type { ChangePlan } from "@/lib/types/core";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";
import { buildScopeContract } from "@/lib/control/scope-contract";
import { buildContextPlan } from "@/lib/control/context-governor";
import { classifyTaskIntent } from "@/lib/ai/task-intent";
import { runPatchGuard } from "@/lib/control/patch-guard";
import { buildRepositoryMap } from "@/lib/control/repo-map";
import { buildTokenWasteSummary, evaluateTokenBudget } from "@/lib/control/token-waste-guard";
import { runRegressionGuard } from "@/lib/control/regression-guard";
import { evaluateStopPolicy } from "@/lib/control/stop-policy";
import { clearTaskSession, buildTaskKey } from "@/lib/control/task-session";
import type { ControlLayerSummary } from "@/lib/control/types";
import { recordControlEvent } from "@/lib/control/control-telemetry";
import { evaluateContextGate } from "@/lib/control/context-gate";
import { buildAgentCoordination } from "@/lib/control/agent-coordination";
import { evaluateDeploymentReadiness } from "@/lib/deployment/deployment-readiness";

function estimateUsd(chars: number): number {
  const tokens = chars / 4;
  return Math.round((tokens / 1000) * 0.002 * 100) / 100;
}

export async function runControlGate(input: {
  request: string;
  plan: ChangePlan;
  files: SourceFileInput[];
  patches: ProposedPatch[];
  repositoryId?: string;
  projectId?: string;
  orgId?: string;
  blastRadius?: string[];
  assumptionsApproved?: boolean;
  reviewFindingCount?: number;
}): Promise<ControlLayerSummary> {
  const scopeContract = buildScopeContract({
    request: input.request,
    plan: input.plan,
    files: input.files,
    patches: input.patches
  });
  const contextGate = evaluateContextGate({
    request: input.request,
    files: input.files,
    targetFiles: input.plan.impact.files,
    assumptionsApproved: input.assumptionsApproved
  });

  const taskIntent = classifyTaskIntent(input.request);
  const contextPlan = await buildContextPlan(input.request, input.files, {
    projectId: input.projectId,
    repositoryId: input.repositoryId,
    orgId: input.orgId,
    taskIntent
  });
  const repositoryMap = buildRepositoryMap(input.files);
  const patchGuard = runPatchGuard({
    patches: input.patches,
    contract: scopeContract,
    corpus: input.files,
    request: input.request
  });

  const blast = input.blastRadius ?? input.plan.impact.blastRadius;
  const regressionGuard = await runRegressionGuard({
    plan: input.plan,
    patches: input.patches,
    corpus: input.files,
    blastRadius: blast,
    repositoryId: input.repositoryId
  });

  const patchChars = input.patches.reduce((sum, p) => sum + p.after.length, 0);
  const estimatedUsd = estimateUsd(contextPlan.estimatedChars + patchChars);
  const tokenEstimate = {
    contextChars: contextPlan.estimatedChars,
    patchChars,
    estimatedUsd
  };

  const tokenWaste = buildTokenWasteSummary({
    contextPlan,
    patches: input.patches,
    estimatedUsd
  });

  const stop = evaluateStopPolicy({
    request: input.request,
    scopeContract,
    patchGuard,
    repositoryId: input.repositoryId,
    patches: input.patches,
    recordAttempt: true
  });

  const tokenBudget = evaluateTokenBudget(contextPlan.estimatedChars);
  let stopReason: string | null = stop.reason;
  if (!tokenBudget.allowed) {
    stopReason = tokenBudget.reason;
  }
  if (!stopReason && contextGate.status !== "proceed_with_assumptions") {
    stopReason = `${contextGate.reason} Context confidence: ${Math.round(contextGate.confidence * 100)}%.`;
  }
  if (!stop.shouldStop && !regressionGuard.passed) {
    stopReason = regressionGuard.summary;
  }

  const deploymentReadiness = evaluateDeploymentReadiness(input.files);
  const agentCoordination = buildAgentCoordination({
    contextGate,
    scopeContract,
    patchGuard,
    regressionGuard,
    stopReason,
    patchesCount: input.patches.length,
    graphSummary: contextPlan.repoGraphSummary,
    securityBlockerCount: deploymentReadiness.blockers.length,
    reviewFindingCount: input.reviewFindingCount
  });

  const canApprove =
    contextGate.status === "proceed_with_assumptions" &&
    agentCoordination.canPatch &&
    !patchGuard.blocked &&
    regressionGuard.passed &&
    !stop.shouldStop &&
    scopeContract.allowedEditFiles.length > 0;
  const canApply = canApprove && input.patches.length > 0;

  const summary: ControlLayerSummary = {
    contextGate,
    agentCoordination,
    scopeContract,
    contextPlan,
    patchGuard,
    regressionGuard,
    repositoryMap,
    tokenWaste,
    stopReason,
    failedPatchAttempts: stop.failedAttempts,
    canApprove,
    canApply,
    tokenEstimate
  };

  void recordControlEvent({
    action: patchGuard.blocked || stop.shouldStop ? "patch_blocked" : "fix_scoped",
    detail: `${patchGuard.filesChanged} files · ${contextPlan.deepRead.length} deep-read`,
    repositoryId: input.repositoryId,
    severity: patchGuard.blocked || stop.shouldStop ? "block" : "info",
    metadata: {
      filesChanged: patchGuard.filesChanged,
      deepRead: contextPlan.deepRead.length,
      estimatedTokens: contextPlan.estimatedTokens,
      blocked: patchGuard.blocked,
      estimatedUsd
    }
  });

  return summary;
}

export function assertApproveAllowed(control: ControlLayerSummary): void {
  if (!control.canApprove) {
    throw new Error(control.stopReason ?? "Control layer blocked approval.");
  }
  const blocks = control.patchGuard.findings.filter((f) => f.severity === "block");
  if (blocks.length > 0) {
    throw new Error(blocks[0].message);
  }
  if (!control.regressionGuard.passed) {
    const fail = control.regressionGuard.checks.find((c) => c.status === "failed");
    throw new Error(fail?.detail ?? control.regressionGuard.summary);
  }
  const agentBlock = control.agentCoordination.decisions.find((decision) => decision.blocksPatch);
  if (agentBlock) {
    throw new Error(`${agentBlock.agent.replace("_", " ")} blocked approval: ${agentBlock.finding}`);
  }
}

export function clearControlTaskSession(repositoryId: string, request: string): void {
  clearTaskSession(buildTaskKey(repositoryId, request));
}
