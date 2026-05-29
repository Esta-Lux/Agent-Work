import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { ProjectBrief, WorkspaceFixReport } from "@/lib/workspace/workspace-types";
import { buildArchitectureRoadmap } from "@/lib/architecture/architecture-roadmap";

export function runArchitectureRoadmapAgent(input: {
  files: SourceFileInput[];
  brief?: Partial<ProjectBrief>;
  report?: Pick<WorkspaceFixReport, "approvalStatus" | "safeToPr" | "controlLayer"> | null;
}) {
  return buildArchitectureRoadmap(input);
}
