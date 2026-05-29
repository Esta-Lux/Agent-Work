import type { WorkspaceFixReport } from "@/lib/workspace/workspace-types";
import { buildBootRisePrBody } from "@/lib/github/pr-body-builder";

export function buildUserPrBodyAgent(input: {
  report: WorkspaceFixReport;
  userRequest: string;
}) {
  return buildBootRisePrBody(input.report, input.userRequest);
}
