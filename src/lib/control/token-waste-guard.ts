import type { ContextPlan } from "@/lib/control/types";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";

/** Max estimated context chars before BootRise blocks LLM spend (chat, fix, context pack). */
export const MAX_CONTEXT_CHARS = 320_000;

export interface TokenWasteSummary {
  filesRead: number;
  filesEdited: number;
  foldersExcluded: number;
  estimatedUsd: number;
  excludedSample: string[];
  message: string;
}

export interface TokenBudgetEvaluation {
  allowed: boolean;
  reason: string | null;
  estimatedChars: number;
}

export function evaluateTokenBudget(estimatedChars: number): TokenBudgetEvaluation {
  if (estimatedChars <= MAX_CONTEXT_CHARS) {
    return { allowed: true, reason: null, estimatedChars };
  }
  return {
    allowed: false,
    reason: `Context budget exceeded (~${Math.round(estimatedChars / 1000)}k chars, max ~${Math.round(MAX_CONTEXT_CHARS / 1000)}k). Narrow the task or name a module path.`,
    estimatedChars
  };
}

export function buildTokenWasteSummary(input: {
  contextPlan: ContextPlan;
  patches: ProposedPatch[];
  estimatedUsd: number;
}): TokenWasteSummary {
  const excludedAreas = new Map<string, number>();
  for (const entry of input.contextPlan.excluded) {
    const top = entry.path.split("/")[0] ?? "other";
    excludedAreas.set(top, (excludedAreas.get(top) ?? 0) + 1);
  }

  const foldersExcluded = excludedAreas.size;
  const excludedSample = [...excludedAreas.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([folder, count]) => `${folder}/ (${count} files)`);

  const filesRead = input.contextPlan.deepRead.length + input.contextPlan.reference.length;
  const filesEdited = input.patches.length;

  const message = [
    `This task used ~$${input.estimatedUsd.toFixed(2)} estimated context cost.`,
    `Read ${filesRead} of ${input.contextPlan.totalFilesInCorpus} files (deep ${input.contextPlan.deepRead.length}, reference ${input.contextPlan.reference.length}).`,
    filesEdited > 0 ? `Proposed ${filesEdited} edit(s).` : "No edits proposed yet.",
    foldersExcluded > 0
      ? `${input.contextPlan.excluded.length} files excluded — BootRise is not blindly burning credits on the whole repo.`
      : "Full corpus is small enough to index entirely."
  ].join(" ");

  return {
    filesRead,
    filesEdited,
    foldersExcluded,
    estimatedUsd: input.estimatedUsd,
    excludedSample,
    message
  };
}
