import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { buildProjectBrainContextPack, type ProjectBrainContextPack } from "@/lib/project-brain/project-brain-context-pack";
import { buildProjectBrainV2, type ProjectBrainV2 } from "@/lib/project-brain/project-brain-v2";

export interface BrainQueryResult {
  brain: ProjectBrainV2;
  contextPack: ProjectBrainContextPack;
}

export function queryProjectBrain(input: {
  repositoryId: string;
  taskText: string;
  files: SourceFileInput[];
}): BrainQueryResult {
  const brain = buildProjectBrainV2({ repositoryId: input.repositoryId, files: input.files });
  return {
    brain,
    contextPack: buildProjectBrainContextPack({
      repositoryId: input.repositoryId,
      taskText: input.taskText,
      files: input.files,
      brain
    })
  };
}
