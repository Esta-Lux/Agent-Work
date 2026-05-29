import { buildProjectBrainSummary } from "@/lib/project-brain/project-brain-summary";

export async function runProjectBrainAgent(input: { orgId: string; projectId: string }) {
  return buildProjectBrainSummary(input.orgId, input.projectId);
}
