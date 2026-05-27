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
import { classifyTaskIntent } from "@/lib/ai/task-intent";
import { buildSeniorArchitectBrief } from "@/lib/ai/senior-architect";

export async function runChatControlGate(input: {
  request: string;
  files: SourceFileInput[];
  repositoryId?: string;
  projectId?: string;
  orgId?: string;
  assumptionsApproved?: boolean;
  mode?: string;
}): Promise<ChatControlSummary> {
  const repo = buildRepoIntelligenceSnapshot(input.files);
  const plan = createInitialChangePlan(input.request, repo);
  const projectId = input.projectId ?? input.repositoryId;
  const orgId = input.orgId;
  const taskIntent = classifyTaskIntent(input.request, { mode: input.mode });

  let brainRules: string[] = [];
  let brainModules: string[] = [];
  let brainDecisions: string[] = [];
  if (orgId && projectId) {
    try {
      const { retrieveProjectBrainContext } = await import("@/lib/project-brain/memory-retriever");
      const brain = await retrieveProjectBrainContext({
        orgId,
        projectId,
        request: { taskText: input.request, maxItems: 8 }
      });
      brainRules = brain.rules;
      brainModules = brain.modules.map((m) => m.name);
      brainDecisions = brain.decisions;
    } catch {
      /* optional */
    }
  }

  const contextPlan = await buildContextPlan(input.request, input.files, {
    projectId,
    repositoryId: input.repositoryId,
    orgId,
    taskIntent
  });

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

  const isReadOnlyReview =
    !isWorkIntent(input.request) &&
    /\b(review|audit|issues?|risks?|gaps?|list all|architecture|overview)\b/i.test(input.request);

  let stopReason: string | null = null;
  if (!tokenBudget.allowed && !isReadOnlyReview) {
    stopReason = tokenBudget.reason;
  } else if (!tokenBudget.allowed && isReadOnlyReview) {
    stopReason = null;
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
    brainRulesCount: brainRules.length,
    brainFileHintsCount: contextPlan.deepRead.length,
    taskIntent: {
      kind: taskIntent.kind,
      depth: taskIntent.depth,
      seniorArchitectMode: taskIntent.seniorArchitectMode,
      summary: taskIntent.summary,
      suggestedMode: taskIntent.suggestedMode
    },
    architectBriefPreview: buildSeniorArchitectBrief({
      request: input.request,
      taskIntent,
      brainRules,
      moduleNames: brainModules,
      decisions: brainDecisions,
      scopeLockMessage: scopeContract.scopeLockMessage
    }).slice(0, 600)
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
