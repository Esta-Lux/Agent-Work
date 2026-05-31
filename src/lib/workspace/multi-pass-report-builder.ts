import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { createPendingFixId, savePendingFix } from "@/lib/workspace/pending-fix-store";
import { buildPlainEnglishFromReport } from "@/lib/workspace/plain-english";
import { computeSafeToPr } from "@/lib/workspace/safe-to-pr";
import { createDiffPreviewFromPatches } from "@/lib/workspace/diff-from-patches";
import { createVerificationSummary } from "@/lib/verification/verification-summary";
import type { ChangePlan } from "@/lib/types/core";
import type { MultiPassExecutionResult } from "@/lib/workspace/work-unit-state";
import type { WorkUnitPlan } from "@/lib/workspace/work-unit-planner";
import type { WorkspaceFixReport } from "@/lib/workspace/workspace-types";

export function buildReportFromMultiPassExecution(input: {
  execution: MultiPassExecutionResult;
  taskDescription: string;
  repositoryId?: string;
  workUnitPlan: WorkUnitPlan;
}): WorkspaceFixReport {
  const repositoryId = input.repositoryId ?? `repo_${Date.now()}`;
  const plan = buildMultiPassPlan(input);
  const patches = input.execution.mergedPatches;
  const pendingFixId = createPendingFixId();
  const diff = createDiffPreviewFromPatches(plan.id, patches, plan.risk.reasons);
  const potentiallyBroken = [
    ...new Set([
      ...input.workUnitPlan.crossFileDependencyWarnings,
      ...input.execution.blockers,
      ...input.execution.warnings
    ])
  ];

  const report: WorkspaceFixReport = {
    repositoryId,
    plan,
    diff,
    blastRadius: plan.impact.blastRadius,
    fixed: patches.map((patch) => ({ path: patch.path, summary: patch.summary })),
    potentiallyBroken,
    howFixed: plan.steps.map((step) => `${step.title}: ${step.summary}`),
    verificationSummary: createVerificationSummary(plan),
    residualRisk: input.execution.blockers.length > 0 ? input.execution.blockers : input.execution.warnings,
    guidanceForBuilder: [
      "Multi-pass execution output is now the source-of-truth patch set for review.",
      "Approve this exact diff to move forward. Re-run only the failing work units if needed."
    ],
    pendingFixId,
    patches,
    patchSource: "multi-pass",
    approvalStatus: "pending_approval",
    planReviewStatus: "pending_approval",
    previewSessionId: null,
    previewUrl: null,
    devPreviewStatus: null
  };

  report.plainEnglishSummary = buildPlainEnglishFromReport(report);
  report.safeToPr = computeSafeToPr({
    report,
    sandboxPassed: false,
    hasRealRepoPatches: false
  });
  return report;
}

export function saveMultiPassPendingFix(input: {
  report: WorkspaceFixReport;
  execution: MultiPassExecutionResult;
  taskDescription: string;
  repoFiles: SourceFileInput[];
  orgId?: string;
  projectId?: string;
}): void {
  if (!input.report.pendingFixId) return;
  savePendingFix(
    {
      id: input.report.pendingFixId,
      repositoryId: input.report.repositoryId,
      request: input.taskDescription,
      plan: input.report.plan,
      patches: input.execution.mergedPatches,
      filesSnapshot: input.repoFiles,
      provider: "bootrise",
      plannerSource: "multi-pass-executor",
      status: "pending_approval",
      createdAt: new Date().toISOString()
    },
    { orgId: input.orgId, projectId: input.projectId }
  );
}

function buildMultiPassPlan(input: {
  execution: MultiPassExecutionResult;
  taskDescription: string;
  workUnitPlan: WorkUnitPlan;
}): ChangePlan {
  return {
    id: `multi_pass_${Date.now()}`,
    intent: {
      request: input.taskDescription,
      interpretedGoal: input.workUnitPlan.taskSummary,
      businessImpact: "Multi-pass work-unit execution prepared the reviewable patch set."
    },
    impact: {
      files: [...new Set(input.execution.mergedPatches.map((patch) => patch.path))],
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
      domain:
        unit.domain === "frontend_ui"
          ? "frontend"
          : unit.domain === "database_rls"
            ? "database"
            : unit.domain === "tests"
              ? "tests"
              : "backend",
      summary: unit.description,
      targetFiles: unit.targetFiles,
      dependsOn: unit.dependsOn
    })),
    validations: [
      {
        id: "multi-pass-report-review",
        kind: "test",
        title: "Multi-pass report review",
        status: input.execution.finalCompletionPassed ? "passed" : "failed",
        notes: input.execution.blockers.join("\n")
      }
    ],
    rollbackStrategy: "Reject this pending fix or rerun blocked work units before approval."
  };
}
