import type { SelfAgentWorkUnit } from "@/lib/agents/admin/self-agent-architect";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";

export function generateSelfAgentPatch(input: {
  missionTitle: string;
  missionObjective: string;
  workUnit: SelfAgentWorkUnit;
  path: string;
  before: string;
}): ProposedPatch {
  const marker = buildMarker(input);
  const after = applyMissionMarker(input.path, input.before, marker);
  return {
    path: input.path,
    before: input.before,
    after,
    summary: `Self-agent changed ${input.path} for ${input.workUnit.label}: ${marker}`
  };
}

export function isReviewOnlyMission(objective: string): boolean {
  return /review-only|review only|audit-only|audit only|analysis only|no code/i.test(objective);
}

function buildMarker(input: {
  missionTitle: string;
  missionObjective: string;
  workUnit: SelfAgentWorkUnit;
}): string {
  const scope = input.workUnit.domain.replace(/_/g, " ");
  return `Self-Agent mission "${input.missionTitle}" (${scope}): ${input.missionObjective.slice(0, 120)}`;
}

function applyMissionMarker(path: string, before: string, marker: string): string {
  const lower = path.toLowerCase();
  if (/\.tsx?$|\.jsx?$/.test(lower)) {
    const token = `// ${marker}`;
    return before.includes(token) ? before : `${token}\n${before}`;
  }
  if (/\.md$/.test(lower)) {
    const token = `> ${marker}`;
    return before.includes(token) ? before : `${token}\n\n${before}`;
  }
  if (/\.json$/.test(lower)) {
    return before;
  }
  const token = `/* ${marker} */`;
  return before.includes(token) ? before : `${token}\n${before}`;
}
