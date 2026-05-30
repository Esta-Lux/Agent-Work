import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { evaluateTaskCompletion } from "@/lib/control/task-completion-evaluator";
import { applyPatchesToFiles } from "@/lib/workspace/apply-patches";
import { buildReportFromMultiPassExecution, saveMultiPassPendingFix } from "@/lib/workspace/multi-pass-report-builder";
import { runWorkUnitPatchRunner } from "@/lib/workspace/work-unit-patch-runner";
import { getWorkUnitRun, updateWorkUnitRunResult } from "@/lib/workspace/work-unit-run-store";
import type { MultiPassExecutionResult, WorkUnitExecution } from "@/lib/workspace/work-unit-state";

export const runtime = "nodejs";

interface RerunRequestBody {
  runId?: string;
  workUnitId?: string;
}

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as RerunRequestBody | null;
    const runId = body?.runId?.trim();
    const workUnitId = body?.workUnitId?.trim();
    if (!runId || !workUnitId) {
      return NextResponse.json({ error: "runId and workUnitId are required." }, { status: 400 });
    }

    const run = getWorkUnitRun(runId, ctx.orgId);
    if (!run) {
      return NextResponse.json({ error: "Work unit run not found." }, { status: 404 });
    }

    const unit = run.workUnitPlan.units.find((item) => item.id === workUnitId);
    if (!unit) {
      return NextResponse.json({ error: "Work unit not found in run plan." }, { status: 404 });
    }

    const indexByUnitId = new Map(
      run.workUnitPlan.executionOrder.flat().map((id, index) => [id, index] as const)
    );
    const unitOrder = indexByUnitId.get(workUnitId);
    if (typeof unitOrder !== "number") {
      return NextResponse.json({ error: "Work unit order is unavailable." }, { status: 400 });
    }

    const priorExecutions = run.result.executions.filter((execution) => {
      const order = indexByUnitId.get(execution.workUnitId);
      return typeof order === "number" && order < unitOrder;
    });
    const missingDependency = unit.dependsOn.find((dependencyId) => {
      const dependencyRun = priorExecutions.find((execution) => execution.workUnitId === dependencyId);
      return !dependencyRun || (dependencyRun.status !== "patched" && dependencyRun.status !== "passed");
    });
    if (missingDependency) {
      return NextResponse.json(
        { error: `Cannot rerun ${workUnitId} before dependency ${missingDependency} passes.` },
        { status: 400 }
      );
    }

    let workingFiles = run.repoFiles;
    for (const execution of priorExecutions) {
      if (execution.patches.length > 0) {
        workingFiles = applyPatchesToFiles(workingFiles, execution.patches).files;
      }
    }

    const rerun = await runWorkUnitPatchRunner({
      taskDescription: run.taskDescription,
      workUnit: unit,
      repoFiles: workingFiles,
      repositoryId: run.repositoryId,
      orgId: run.orgId,
      projectId: run.projectId,
      userId: ctx.user.id
    });

    const downstreamIds = new Set(
      run.workUnitPlan.executionOrder.flat().filter((id) => (indexByUnitId.get(id) ?? 0) > unitOrder)
    );
    const executions: WorkUnitExecution[] = run.result.executions.map((execution) => {
      if (execution.workUnitId === workUnitId) return rerun;
      if (downstreamIds.has(execution.workUnitId)) {
        return {
          ...execution,
          status: "skipped",
          blockers: [
            "Marked for rerun after an upstream unit changed. Rerun this unit to refresh downstream output."
          ]
        };
      }
      return execution;
    });

    const mergedPatches = executions
      .filter((execution) => execution.status === "patched")
      .flatMap((execution) => execution.patches);
    const completion = evaluateTaskCompletion({
      request: run.taskDescription,
      plan: {
        id: `multi_pass_rerun_${randomUUID()}`,
        intent: {
          request: run.taskDescription,
          interpretedGoal: run.workUnitPlan.taskSummary,
          businessImpact: "Work unit rerun completed."
        },
        impact: {
          files: [...new Set(run.workUnitPlan.units.flatMap((plannedUnit) => plannedUnit.targetFiles))],
          services: ["workspace"],
          apis: [],
          databaseSchemas: [],
          blastRadius: run.workUnitPlan.crossFileDependencyWarnings
        },
        risk: {
          level: run.workUnitPlan.estimatedRiskLevel,
          reasons: run.workUnitPlan.crossFileDependencyWarnings
        },
        steps: run.workUnitPlan.units.map((plannedUnit) => ({
          id: plannedUnit.id,
          title: plannedUnit.title,
          domain:
            plannedUnit.domain === "frontend_ui"
              ? "frontend"
              : plannedUnit.domain === "database_rls"
                ? "database"
                : plannedUnit.domain === "tests"
                  ? "tests"
                  : "backend",
          summary: plannedUnit.description,
          targetFiles: plannedUnit.targetFiles,
          dependsOn: plannedUnit.dependsOn
        })),
        validations: [
          {
            id: "multi-pass-rerun-completion",
            kind: "test",
            title: "Multi-pass rerun completion evaluator",
            status: "pending"
          }
        ],
        rollbackStrategy: "Rerun downstream work units after any upstream unit changes."
      },
      patches: mergedPatches
    });

    const blockers = [
      ...executions.flatMap((execution) => execution.blockers),
      ...completion.findings.filter((finding) => finding.severity === "block").map((finding) => finding.message)
    ];
    const warnings = [
      ...executions.flatMap((execution) => execution.warnings),
      ...completion.findings
        .filter((finding) => finding.severity === "warning")
        .map((finding) => finding.message)
    ];
    const status =
      blockers.length > 0
        ? "blocked"
        : executions.some((execution) => execution.status === "skipped")
          ? "partial"
          : mergedPatches.length > 0
            ? "completed"
            : "partial";

    const result: MultiPassExecutionResult = {
      taskId: run.result.taskId,
      status,
      executions,
      mergedPatches,
      finalCompletionPassed: !completion.blocked && status !== "blocked",
      blockers,
      warnings
    };

    const updated = updateWorkUnitRunResult(run.id, ctx.orgId, result);
    if (!updated) {
      return NextResponse.json({ error: "Failed to persist rerun result." }, { status: 500 });
    }

    const report = buildReportFromMultiPassExecution({
      execution: result,
      taskDescription: run.taskDescription,
      repositoryId: run.repositoryId,
      workUnitPlan: run.workUnitPlan
    });
    saveMultiPassPendingFix({
      report,
      execution: result,
      taskDescription: run.taskDescription,
      repoFiles: run.repoFiles,
      orgId: run.orgId,
      projectId: run.projectId
    });

    return NextResponse.json({ result, runId: updated.id, report });
  });
}
