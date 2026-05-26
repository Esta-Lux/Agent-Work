import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { buildContextPlan } from "@/lib/control/context-governor";
import { buildRepositoryMap } from "@/lib/control/repo-map";
import { buildTokenWasteSummary } from "@/lib/control/token-waste-guard";
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
}): Promise<ChatControlSummary> {
  const repo = buildRepoIntelligenceSnapshot(input.files);
  const plan = createInitialChangePlan(input.request, repo);
  const contextPlan = await buildContextPlan(input.request, input.files, {
    projectId: input.projectId,
    repositoryId: input.repositoryId
  });
  const repositoryMap = buildRepositoryMap(input.files);
  const scopeContract = buildScopeContract({
    request: input.request,
    plan,
    files: input.files
  });
  const contextGate = evaluateContextGate({ request: input.request, files: input.files });

  const estimatedUsd = Math.round(((contextPlan.estimatedChars / 4) / 1000) * 0.002 * 100) / 100;
  const tokenWaste = buildTokenWasteSummary({
    contextPlan,
    patches: [],
    estimatedUsd
  });

  const failedPatchAttempts = input.repositoryId
    ? getFailedAttemptCount(input.repositoryId, input.request)
    : 0;

  let stopReason: string | null = null;
  if (failedPatchAttempts >= 2) {
    stopReason = `Stopped after ${failedPatchAttempts} failed patch attempts on this task — narrow scope before more chat spend.`;
  } else if (input.request.trim().length < 8) {
    stopReason = "Message is too vague — specify screen, API, or file.";
  } else if (isWorkIntent(input.request) && contextGate.status !== "proceed_with_assumptions") {
    stopReason = `${contextGate.reason} Context confidence: ${Math.round(contextGate.confidence * 100)}%.`;
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
    scopePreview: scopeContract.scopeLockMessage
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
}): Promise<string> {
  const rules = await buildInjectedContextRules({
    files: input.files,
    projectId: input.projectId
  });
  return rules.combinedBlock;
}
