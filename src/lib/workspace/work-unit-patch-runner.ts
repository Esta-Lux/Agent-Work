import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { createPendingFixPlan } from "@/lib/workspace/workspace-fix.server";
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
  const scopedRequest = `${input.taskDescription}\n\nWork unit: ${input.workUnit.title}\nScope files: ${input.workUnit.targetFiles.join(", ")}`;
  const result = await createPendingFixPlan(input.repoFiles, scopedRequest, "bootrise", {
    orgId: input.orgId,
    projectId: input.projectId ?? input.repositoryId,
    userId: input.userId,
    assumptionsApproved: true
  });

  const scopedPatches = (result.report.patches ?? []).filter((patch) => input.workUnit.targetFiles.includes(patch.path));
  const outOfScope = (result.report.patches ?? []).filter((patch) => !input.workUnit.targetFiles.includes(patch.path));
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (outOfScope.length > 0) {
    blockers.push(`Generated ${outOfScope.length} out-of-scope patch(es): ${outOfScope.map((patch) => patch.path).join(", ")}`);
  }
  if ((result.report.controlLayer?.canApprove ?? true) === false) {
    blockers.push(result.report.controlLayer?.stopReason ?? "Control Gate blocked this unit.");
  }
  warnings.push(...(result.report.controlLayer?.taskCompletion.findings ?? []).filter((finding) => finding.severity === "warning").map((finding) => finding.message));

  return {
    workUnitId: input.workUnit.id,
    status: blockers.length > 0 ? "blocked" : scopedPatches.length > 0 ? "patched" : "passed",
    patches: scopedPatches,
    blockers,
    warnings,
    controlSummary: result.report.controlLayer?.agentCoordination?.leadSummary
  };
}
