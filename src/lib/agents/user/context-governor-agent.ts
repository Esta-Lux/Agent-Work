import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { TaskIntent } from "@/lib/ai/task-intent";
import { buildContextPlan } from "@/lib/control/context-governor";
import { classifyTaskIntent } from "@/lib/ai/task-intent";

export async function runContextGovernorAgent(input: {
  request: string;
  files: SourceFileInput[];
  projectId?: string;
  repositoryId?: string;
  orgId?: string;
  taskIntent?: TaskIntent;
  mode?: string;
}) {
  return buildContextPlan(input.request, input.files, {
    projectId: input.projectId,
    repositoryId: input.repositoryId,
    orgId: input.orgId,
    taskIntent: input.taskIntent,
    mode: input.mode
  });
}

export { classifyTaskIntent };
