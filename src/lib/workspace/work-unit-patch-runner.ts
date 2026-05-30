import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { runScopedWorkUnitBuilder } from "@/lib/workspace/scoped-work-unit-builder";
import type { WorkUnit } from "@/lib/workspace/work-unit-planner";
import type { WorkUnitExecution } from "@/lib/workspace/work-unit-state";

export async function runWorkUnitPatchRunner(input: {
  taskDescription: string;
  workUnit: WorkUnit;
  repoFiles: SourceFileInput[];
  repositoryId?: string;
  orgId?: string;
  projectId?: string;
  userId?: string;
}): Promise<WorkUnitExecution> {
  const editableFiles = input.repoFiles.filter((file) => input.workUnit.targetFiles.includes(file.path));
  const readOnlyFiles = input.repoFiles.filter((file) => input.workUnit.readOnlyFiles.includes(file.path));
  const result = await runScopedWorkUnitBuilder({
    taskDescription: input.taskDescription,
    workUnit: input.workUnit,
    editableFiles,
    readOnlyFiles,
    orgId: input.orgId,
    projectId: input.projectId ?? input.repositoryId,
    userId: input.userId,
    repositoryId: input.repositoryId
  });

  return {
    workUnitId: input.workUnit.id,
    status: result.status === "patched" || result.status === "passed" ? result.status : "blocked",
    patches: result.patches,
    blockers: result.blockers,
    warnings: result.warnings,
    controlSummary: result.controlSummary
  };
}
