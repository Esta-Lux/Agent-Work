import { evaluateTaskCompletion } from "@/lib/control/task-completion-evaluator";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { applyPatchesToFiles } from "@/lib/workspace/apply-patches";
import type { WorkUnitPlan } from "@/lib/workspace/work-unit-planner";
import { runWorkUnitPatchRunner } from "@/lib/workspace/work-unit-patch-runner";
import type { MultiPassExecutionResult, WorkUnitExecution } from "@/lib/workspace/work-unit-state";

export async function runMultiPassExecutor(input: {
  taskDescription: string;
  workUnitPlan: WorkUnitPlan;
  repoFiles: SourceFileInput[];
  repositoryId?: string;
  orgId?: string;
  projectId?: string;
  userId?: string;
}): Promise<MultiPassExecutionResult> {
  const executions: WorkUnitExecution[] = [];
  let workingFiles = input.repoFiles;

  for (const pass of input.workUnitPlan.executionOrder) {
    for (const unitId of pass) {
      const unit = input.workUnitPlan.units.find((item) => item.id === unitId);
      if (!unit) continue;
      const execution = await runWorkUnitPatchRunner({
        taskDescription: input.taskDescription,
        workUnit: unit,
        repoFiles: workingFiles,
        repositoryId: input.repositoryId,
        orgId: input.orgId,
        projectId: input.projectId,
        userId: input.userId
      });
      executions.push(execution);
      if (execution.patches.length > 0) {
        workingFiles = applyPatchesToFiles(workingFiles, execution.patches).files;
      }
      if (execution.status === "blocked") {
        return {
          taskId: input.workUnitPlan.taskSummary,
          status: "blocked",
          executions,
          mergedPatches: executions.flatMap((item) => item.patches),
          finalCompletionPassed: false,
          blockers: execution.blockers,
          warnings: executions.flatMap((item) => item.warnings)
        };
      }
    }
  }

  const mergedPatches = executions.flatMap((item) => item.patches);
  const completion = evaluateTaskCompletion({
    request: input.taskDescription,
    plan: {
      id: `multi_pass_${Date.now()}`,
      intent: {
        request: input.taskDescription,
        interpretedGoal: input.workUnitPlan.taskSummary,
        businessImpact: "Multi-pass execution completed for workspace patch generation."
      },
      impact: {
        files: [...new Set(input.workUnitPlan.units.flatMap((unit) => unit.targetFiles))],
        services: ["workspace"],
        apis: [],
        databaseSchemas: [],
        blastRadius: input.workUnitPlan.crossFileDependencyWarnings
      },
      risk: {
        level: input.workUnitPlan.estimatedRiskLevel,
        reasons: input.workUnitPlan.crossFileDependencyWarnings
      },
      steps: input.workUnitPlan.units.map((unit) => ({
        id: unit.id,
        title: unit.title,
        domain: unit.domain === "frontend_ui" ? "frontend" : unit.domain === "database_rls" ? "database" : unit.domain === "tests" ? "tests" : "backend",
        summary: unit.description,
        targetFiles: unit.targetFiles,
        dependsOn: unit.dependsOn
      })),
      validations: [
        {
          id: "multi-pass-completion",
          kind: "test",
          title: "Multi-pass completion evaluator",
          status: "pending"
        }
      ],
      rollbackStrategy: "Reject or re-run blocked work units before approving final patch set."
    },
    patches: mergedPatches
  });

  return {
    taskId: input.workUnitPlan.taskSummary,
    status: mergedPatches.length > 0 ? "completed" : "partial",
    executions,
    mergedPatches,
    finalCompletionPassed: !completion.blocked,
    blockers: completion.findings.filter((finding) => finding.severity === "block").map((finding) => finding.message),
    warnings: completion.findings.filter((finding) => finding.severity === "warning").map((finding) => finding.message)
  };
}
