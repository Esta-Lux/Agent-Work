import type { WorkspaceFixReport } from "@/lib/workspace/workspace-types";
import { buildWorkspaceDraftPrBody } from "@/lib/github/pr-body-builder";

export function buildUserPrBodyAgent(input: {
  title: string;
  report: WorkspaceFixReport;
  repository: string;
  branch: string;
}) {
  return buildWorkspaceDraftPrBody({
    title: input.title,
    report: input.report,
    repository: input.repository,
    branch: input.branch
  });
}
