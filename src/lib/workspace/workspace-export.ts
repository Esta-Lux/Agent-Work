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
  return {
    format: "bootrise-bundle-v1" as const,
    exportedAt: new Date().toISOString(),
    product: "BootRise",
    aiProvider: input.preferredProvider ?? "bootrise",
    projectBrief: input.projectBrief,
    files: input.files,
    plan: input.plan ?? null,
    github: input.githubUrl ? { url: input.githubUrl, branch: input.branch ?? "main" } : null,
    architectureHealth: input.repoHealth ?? null,
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
      "This bundle contains your product brief, source files, and the last plan/report from the workspace.",
      "",
      "## GitHub",
      "Create a repo, then push these files or use BootRise GitHub export with a personal access token.",
      "",
      "## Deploy",
      `Target noted in brief: ${input.projectBrief.deploymentTarget}`
    ].join("\n")
  };
}
