import type { ProjectBrief } from "@/lib/workspace/workspace-types";

export function createDefaultProjectBrief(): ProjectBrief {
  return {
    productName: "",
    audience: "",
    primaryWorkflow: "",
    authRequired: false,
    paymentsRequired: false,
    deploymentTarget: "vercel",
    constraints: [],
    longBuild: false
  };
}

export function createLaunchProjectSeed(mode: "blank" | "import", name?: string): {
  name: string;
  brief: ProjectBrief;
} {
  const projectName = name?.trim() || (mode === "import" ? "Imported repository" : "Untitled project");
  const brief = createDefaultProjectBrief();
  brief.productName = projectName;
  brief.primaryWorkflow =
    mode === "import" ? "Import a repository and prepare the BootRise workspace." : "Stand up the core product workflow.";
  return { name: projectName, brief };
}

export function buildWorkspaceProjectPath(projectId: string): string {
  return `/workspace/${encodeURIComponent(projectId)}`;
}
