import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { ChangePlan } from "@/lib/types/core";
import type { RepoHealthSummary } from "@/lib/reporting/repo-health";
import type { ProjectBrief, WorkspaceFixReport } from "@/lib/workspace/workspace-types";

export function createExportBundle(input: {
  projectBrief: ProjectBrief;
  files: SourceFileInput[];
  plan?: ChangePlan;
  report?: WorkspaceFixReport;
  preferredProvider?: "bootrise" | "openai";
  repoHealth?: RepoHealthSummary | null;
  githubUrl?: string | null;
  branch?: string | null;
}) {
  const control = input.report?.controlLayer;
  const prManifest = control
    ? {
        title: `BootRise: ${input.report?.plan.intent.interpretedGoal.slice(0, 72) ?? "Controlled change"}`,
        taskScope: control.scopeContract.scopeLockMessage,
        taskType: control.scopeContract.taskType,
        allowedEditFiles: control.scopeContract.allowedEditFiles,
        forbiddenPatterns: control.scopeContract.forbiddenPatterns,
        diffBudget: {
          maxFiles: control.scopeContract.maxFilesChanged,
          maxLines: control.scopeContract.maxLinesChanged,
          actualFiles: control.patchGuard.filesChanged,
          actualLines: control.patchGuard.linesChanged
        },
        blastRadius: input.report?.potentiallyBroken ?? input.report?.blastRadius ?? [],
        validation: {
          safeToPr: input.report?.safeToPr ?? null,
          regression: control.regressionGuard.summary,
          suggestedCommands: control.regressionGuard.suggestedCommands
        },
        securityFindings: control.patchGuard.findings
          .filter((f) => f.category === "forbidden" || f.message.toLowerCase().includes("security"))
          .map((f) => f.message),
        rollbackPlan: input.report?.plan.rollbackStrategy ?? "Revert listed files from bundle snapshot.",
        reviewerChecklist: input.report?.safeToPr?.checklist ?? [
          "Confirm scope matches PR diff",
          "Run suggested verification commands",
          "Re-test blast radius modules"
        ],
        tokenTransparency: control.tokenWaste.message
      }
    : null;

  return {
    format: "bootrise-bundle-v1" as const,
    exportedAt: new Date().toISOString(),
    product: "BootRise",
    tagline: "BootRise stops AI coding agents from breaking large codebases.",
    subheadline:
      "Scopes the task, controls context, blocks hallucinated edits, verifies the patch, and only ships when safe.",
    aiProvider: input.preferredProvider ?? "bootrise",
    projectBrief: input.projectBrief,
    files: input.files,
    plan: input.plan ?? null,
    github: input.githubUrl ? { url: input.githubUrl, branch: input.branch ?? "main" } : null,
    architectureHealth: input.repoHealth ?? null,
    controlLayer: control ?? null,
    prManifest,
    report: input.report
      ? {
          interpretedGoal: input.report.plan.intent.interpretedGoal,
          risk: input.report.plan.risk.level,
          safeToPr: input.report.safeToPr ?? null,
          plainEnglishSummary: input.report.plainEnglishSummary ?? null,
          fixed: input.report.fixed,
          potentiallyBroken: input.report.potentiallyBroken,
          howFixed: input.report.howFixed,
          residualRisk: input.report.residualRisk,
          guidanceForBuilder: input.report.guidanceForBuilder
        }
      : null,
    readme: [
      "# BootRise export",
      "",
      "This bundle contains your product brief, source files, control-layer scope, and the last plan/report.",
      "",
      prManifest ? "## Draft PR manifest" : "",
      prManifest ? `- **Scope:** ${prManifest.taskScope}` : "",
      prManifest ? `- **Blast radius:** ${prManifest.blastRadius.slice(0, 5).join("; ") || "narrow"}` : "",
      prManifest ? `- **Rollback:** ${prManifest.rollbackPlan}` : "",
      "",
      "## GitHub",
      "Create a repo, then push these files or use BootRise GitHub export with a personal access token.",
      "",
      "## Deploy",
      `Target noted in brief: ${input.projectBrief.deploymentTarget}`
    ]
      .filter(Boolean)
      .join("\n")
  };
}
