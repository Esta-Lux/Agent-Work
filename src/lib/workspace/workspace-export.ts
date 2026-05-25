import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { ChangePlan } from "@/lib/types/core";
import type { ProjectBrief, WorkspaceFixReport } from "@/lib/workspace/workspace-types";

export function createExportBundle(input: {
  projectBrief: ProjectBrief;
  files: SourceFileInput[];
  plan?: ChangePlan;
  report?: WorkspaceFixReport;
}) {
  return {
    format: "bootrise-bundle-v1" as const,
    exportedAt: new Date().toISOString(),
    product: "BootRise",
    projectBrief: input.projectBrief,
    files: input.files,
    plan: input.plan ?? null,
    report: input.report
      ? {
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
