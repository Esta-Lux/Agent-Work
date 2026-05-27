import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { buildContextPlan } from "@/lib/control/context-governor";
import { buildRepositoryMap } from "@/lib/control/repo-map";
import { buildTokenWasteSummary, evaluateTokenBudget } from "@/lib/control/token-waste-guard";
import { buildScopeContract } from "@/lib/control/scope-contract";
import { createInitialChangePlan } from "@/lib/planning/planner";
import { buildRepoIntelligenceSnapshot } from "@/lib/intelligence/repo-intelligence";
import type { ChatControlSummary, ContextPlan } from "@/lib/control/types";
import { getFailedAttemptCount } from "@/lib/control/task-session";
import { buildInjectedContextRules } from "@/lib/control/context-rules";
import { evaluateContextGate, isWorkIntent } from "@/lib/control/context-gate";

export async function runChatControlGate(input: {
  request: string;
  files: SourceFileInput[];
  repositoryId?: string;
  projectId?: string;
  orgId?: string;
  assumptionsApproved?: boolean;
}): Promise<ChatControlSummary> {
  const repo = buildRepoIntelligenceSnapshot(input.files);
  const plan = createInitialChangePlan(input.request, repo);
  const projectId = input.projectId ?? input.repositoryId;
  const orgId = input.orgId;

  const contextPlan = await buildContextPlan(input.request, input.files, {
    projectId,
    repositoryId: input.repositoryId,
    orgId
  });

  let brainRulesCount = 0;
  let brainFileHintsCount = 0;
  if (orgId && projectId) {
    try {
      const { retrieveProjectBrainContext } = await import("@/lib/project-brain/memory-retriever");
      const brain = await retrieveProjectBrainContext({
        orgId,
        projectId,
        request: { taskText: input.request, maxItems: 6 }
      });
      brainRulesCount = brain.rules.length;
      brainFileHintsCount = brain.fileHints.length;
    } catch {
      /* optional */
    }
  }

  const repositoryMap = buildRepositoryMap(input.files);
  const scopeContract = buildScopeContract({
    request: input.request,
    plan,
    files: input.files
  });
  const contextGate = evaluateContextGate({
    request: input.request,
    files: input.files,
    targetFiles: plan.impact.files,
    assumptionsApproved: input.assumptionsApproved
  });

  const estimatedUsd = Math.round(((contextPlan.estimatedChars / 4) / 1000) * 0.002 * 100) / 100;
  const tokenWaste = buildTokenWasteSummary({
    contextPlan,
    patches: [],
    estimatedUsd
  });
  const tokenBudget = evaluateTokenBudget(contextPlan.estimatedChars);

  const failedPatchAttempts = input.repositoryId
    ? getFailedAttemptCount(input.repositoryId, input.request)
    : 0;

  let stopReason: string | null = null;
  if (!tokenBudget.allowed) {
    stopReason = tokenBudget.reason;
  } else if (failedPatchAttempts >= 2) {
    stopReason = `Stopped after ${failedPatchAttempts} failed patch attempts on this task — narrow scope before more chat spend.`;
  } else if (input.request.trim().length < 8) {
    stopReason = "Message is too vague — specify screen, API, or file.";
  } else if (isWorkIntent(input.request) && contextGate.status === "blocked") {
    stopReason = `${contextGate.reason} Context confidence: ${Math.round(contextGate.confidence * 100)}%.`;
  } else if (isWorkIntent(input.request) && contextGate.status === "needs_clarification") {
    stopReason = `${contextGate.reason} Answer the questions below or reply "proceed with assumptions".`;
  } else if (scopeContract.confidence < 0.45 && input.files.length > 50) {
    stopReason = "Low confidence on likely files — mention a path or module name.";
  }

  return {
    contextGate,
    contextPlan,
    repositoryMap,
    tokenWaste,
    canProceed: !stopReason,
    stopReason,
    failedPatchAttempts,
    scopePreview: scopeContract.scopeLockMessage,
    assumptionsApproved: contextGate.status === "proceed_with_assumptions",
    brainRulesCount,
    brainFileHintsCount
  };
}

export function selectChatContextFiles(files: SourceFileInput[], contextPlan: ContextPlan): SourceFileInput[] {
  const byPath = new Map(files.map((f) => [f.path, f]));
  const ordered = [...contextPlan.deepRead, ...contextPlan.reference];
  const picked: SourceFileInput[] = [];
  const seen = new Set<string>();
  for (const entry of ordered) {
    if (seen.has(entry.path)) continue;
    const file = byPath.get(entry.path);
    if (file) {
      picked.push(file);
      seen.add(entry.path);
    }
  }
  return picked.length > 0 ? picked : files.slice(0, 24);
}

export async function buildChatRulesBlock(input: {
  files: SourceFileInput[];
  projectId?: string;
  orgId?: string;
  request?: string;
}): Promise<string> {
  const rules = await buildInjectedContextRules({
    files: input.files,
    projectId: input.projectId
  });
  let block = rules.combinedBlock;

  if (input.orgId && input.projectId && input.request) {
    try {
      const { retrieveProjectBrainContext } = await import("@/lib/project-brain/memory-retriever");
      const brain = await retrieveProjectBrainContext({
        orgId: input.orgId,
        projectId: input.projectId,
        request: { taskText: input.request, maxItems: 6 }
      });
      if (brain.rules.length) {
        const brainBlock = `## Project Brain rules\n${brain.rules.join("\n")}`;
        block = `${brainBlock}\n\n${block}`.trim();
      }
    } catch {
      /* optional */
    }
  }

  return block;
}
