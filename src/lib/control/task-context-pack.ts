import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { buildScopeContract } from "@/lib/control/scope-contract";
import { buildRepositoryMap } from "@/lib/control/repo-map";
import { buildTokenWasteSummary, evaluateTokenBudget } from "@/lib/control/token-waste-guard";
import { buildContextPlan } from "@/lib/control/context-governor";
import { evaluateContextGate, userApprovedAssumptions } from "@/lib/control/context-gate";
import { buildAgentCoordination } from "@/lib/control/agent-coordination";
import { createInitialChangePlan } from "@/lib/planning/planner";
import { buildRepoIntelligenceSnapshot } from "@/lib/intelligence/repo-intelligence";
import { getFailedAttemptCount, buildTaskKey } from "@/lib/control/task-session";
import type { TaskContextPack } from "@/lib/control/types";

export async function buildTaskContextPack(input: {
  request: string;
  files: SourceFileInput[];
  orgId: string;
  projectId: string;
  repositoryId?: string;
  assumptionsApproved?: boolean;
  targetFiles?: string[];
}): Promise<TaskContextPack> {
  const repo = buildRepoIntelligenceSnapshot(input.files);
  const plan = createInitialChangePlan(input.request, repo);
  const assumptionsApproved =
    Boolean(input.assumptionsApproved) || userApprovedAssumptions(input.request);

  const contextGate = evaluateContextGate({
    request: input.request,
    files: input.files,
    targetFiles: input.targetFiles ?? plan.impact.files,
    assumptionsApproved
  });

  const contextPlan = await buildContextPlan(input.request, input.files, {
    projectId: input.projectId,
    repositoryId: input.repositoryId,
    orgId: input.orgId
  });

  const scopeContract = buildScopeContract({
    request: input.request,
    plan,
    files: input.files
  });

  const repositoryMap = buildRepositoryMap(input.files);
  const estimatedUsd = Math.round(((contextPlan.estimatedChars / 4) / 1000) * 0.002 * 100) / 100;
  const tokenWaste = buildTokenWasteSummary({ contextPlan, patches: [], estimatedUsd });
  const tokenBudget = evaluateTokenBudget(contextPlan.estimatedChars);

  const brainSnapshot = await loadBrainSnapshot(input.orgId, input.projectId, input.request);

  const agentCoordination = buildAgentCoordination({
    contextGate,
    scopeContract,
    patchGuard: {
      passed: true,
      blocked: false,
      filesChanged: 0,
      linesChanged: 0,
      newFiles: 0,
      forbiddenTouched: [],
      outOfScopeFiles: [],
      findings: []
    },
    regressionGuard: {
      passed: true,
      checks: [],
      summary: "Preview only — regression checks run after patch proposal.",
      suggestedCommands: [],
      executedCommands: []
    },
    stopReason: null,
    patchesCount: 0
  });

  const taskKey = buildTaskKey(input.repositoryId ?? input.projectId, input.request);
  const failedPatchAttempts = input.repositoryId
    ? getFailedAttemptCount(input.repositoryId, input.request)
    : 0;

  let canProceed = true;
  let stopReason: string | null = null;

  if (!tokenBudget.allowed) {
    canProceed = false;
    stopReason = tokenBudget.reason;
  } else if (failedPatchAttempts >= 2) {
    canProceed = false;
    stopReason = `Stopped after ${failedPatchAttempts} failed patch attempts — narrow scope before more spend.`;
  } else if (contextGate.status === "blocked") {
    canProceed = false;
    stopReason = contextGate.reason;
  } else if (contextGate.status === "needs_clarification") {
    canProceed = false;
    stopReason = `${contextGate.reason} Reply with answers or say "proceed with assumptions".`;
  }

  return {
    taskKey,
    createdAt: new Date().toISOString(),
    request: input.request,
    orgId: input.orgId,
    projectId: input.projectId,
    repositoryId: input.repositoryId,
    contextGate,
    scopeContract,
    contextPlan,
    repositoryMap,
    tokenWaste,
    agentCoordination,
    brainSnapshot,
    canProceed,
    stopReason,
    assumptionsApproved: contextGate.status === "proceed_with_assumptions"
  };
}

async function loadBrainSnapshot(
  orgId: string,
  projectId: string,
  request: string
): Promise<TaskContextPack["brainSnapshot"]> {
  try {
    const { retrieveProjectBrainContext } = await import("@/lib/project-brain/memory-retriever");
    const brain = await retrieveProjectBrainContext({
      orgId,
      projectId,
      request: { taskText: request, maxItems: 6 }
    });
    return {
      rules: brain.rules.slice(0, 8),
      fileHints: brain.fileHints.map((f) => f.path).slice(0, 12),
      moduleNames: brain.modules.map((m) => m.name).slice(0, 8)
    };
  } catch {
    return { rules: [], fileHints: [], moduleNames: [] };
  }
}

export function formatContextPackSummary(pack: TaskContextPack): string {
  const deep = pack.contextPlan.deepRead.length;
  const ref = pack.contextPlan.reference.length;
  const excl = pack.contextPlan.excluded.length;
  const brain =
    pack.brainSnapshot && (pack.brainSnapshot.rules.length > 0 || pack.brainSnapshot.fileHints.length > 0)
      ? ` · Brain: ${pack.brainSnapshot.rules.length} rules, ${pack.brainSnapshot.fileHints.length} file hints`
      : "";
  return `Context: deep ${deep}, reference ${ref}, excluded ${excl} of ${pack.contextPlan.totalFilesInCorpus}${brain}. Confidence ${Math.round(pack.contextGate.confidence * 100)}%.`;
}
