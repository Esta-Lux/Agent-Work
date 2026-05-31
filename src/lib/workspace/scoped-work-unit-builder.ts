import { createPendingFixPlan } from "@/lib/workspace/workspace-fix.server";
import type { WorkUnit } from "@/lib/workspace/work-unit-planner";
import type { ProjectBrainContextPack } from "@/lib/project-brain/project-brain-context-pack";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";

export interface ScopedWorkUnitBuildInput {
  taskDescription: string;
  workUnit: WorkUnit;
  editableFiles: Array<{ path: string; content: string }>;
  readOnlyFiles: Array<{ path: string; content: string }>;
  brainContext?: ProjectBrainContextPack;
  productContext?: {
    oneLineDescription?: string;
    policies?: string[];
    definitionOfDone?: string[];
  };
}

export interface ScopedWorkUnitBuildResult {
  status: "patched" | "passed" | "blocked" | "clarificationNeeded" | "splitRequired";
  patches: ProposedPatch[];
  blockers: string[];
  warnings: string[];
  controlSummary?: string;
}

export async function runScopedWorkUnitBuilder(
  input: ScopedWorkUnitBuildInput & { orgId?: string; projectId?: string; userId?: string; repositoryId?: string }
): Promise<ScopedWorkUnitBuildResult> {
  const targetFiles = new Set(input.workUnit.targetFiles);
  const editableFiles = input.editableFiles.filter((file) => targetFiles.has(file.path));
  const missingTargets = input.workUnit.targetFiles.filter((path) => !editableFiles.some((file) => file.path === path));
  if (missingTargets.length > 0) {
    return {
      status: "clarificationNeeded",
      patches: [],
      blockers: [`Missing required editable context for: ${missingTargets.join(", ")}`],
      warnings: []
    };
  }

  if (input.workUnit.targetFiles.length > 8 || input.workUnit.estimatedComplexity === "high") {
    return {
      status: "splitRequired",
      patches: [],
      blockers: [
        `Work unit ${input.workUnit.id} is too broad (${input.workUnit.targetFiles.length} files). Split this unit before patching.`
      ],
      warnings: []
    };
  }

  const scopedRequest = buildScopedRequest(input);
  const result = await createPendingFixPlan(editableFiles, scopedRequest, "bootrise", {
    orgId: input.orgId,
    projectId: input.projectId ?? input.repositoryId,
    userId: input.userId,
    assumptionsApproved: true
  });

  const allPatches = result.report.patches ?? [];
  const outOfScope = allPatches.filter((patch) => !targetFiles.has(patch.path));
  const scopedPatches = allPatches.filter((patch) => targetFiles.has(patch.path));
  const missingPatchShape = scopedPatches.filter(
    (patch) => typeof patch.before !== "string" || typeof patch.after !== "string"
  );

  const blockers: string[] = [];
  if (outOfScope.length > 0) {
    blockers.push(`Generated ${outOfScope.length} out-of-scope patch(es): ${outOfScope.map((patch) => patch.path).join(", ")}`);
  }
  if (missingPatchShape.length > 0) {
    blockers.push("Generated patch payload missing required before/after content.");
  }
  if ((result.report.controlLayer?.canApprove ?? true) === false) {
    blockers.push(result.report.controlLayer?.stopReason ?? "Control Gate blocked scoped work-unit output.");
  }

  return {
    status: blockers.length > 0 ? "blocked" : scopedPatches.length > 0 ? "patched" : "passed",
    patches: scopedPatches.map((patch) => ({ ...patch, summary: patch.summary || `Scoped change for ${patch.path}` })),
    blockers,
    warnings: (result.report.controlLayer?.taskCompletion.findings ?? [])
      .filter((finding) => finding.severity === "warning")
      .map((finding) => finding.message),
    controlSummary: result.report.controlLayer?.agentCoordination?.leadSummary
  };
}

function buildScopedRequest(input: ScopedWorkUnitBuildInput): string {
  const readOnlyContext = input.readOnlyFiles
    .slice(0, 4)
    .map((file) => `Read-only context (${file.path}):\n${file.content.slice(0, 1400)}`)
    .join("\n\n");

  return [
    input.taskDescription.trim(),
    "",
    `Work unit: ${input.workUnit.title}`,
    `Scope files (editable only): ${input.workUnit.targetFiles.join(", ")}`,
    `Read-only files (context only): ${input.workUnit.readOnlyFiles.join(", ") || "none"}`,
    `Acceptance: ${input.workUnit.acceptanceCriteria.join(" | ")}`,
    input.brainContext
      ? `Project brain context: files=${input.brainContext.relevantFiles.slice(0, 6).join(", ")}; risks=${input.brainContext.riskNotes.slice(0, 4).join(" | ")}`
      : "",
    input.productContext
      ? `Product context: ${input.productContext.oneLineDescription ?? ""}\nPolicies: ${(input.productContext.policies ?? []).join(" | ")}\nDefinition of done: ${(input.productContext.definitionOfDone ?? []).join(" | ")}`
      : "",
    readOnlyContext
  ]
    .filter(Boolean)
    .join("\n");
}
