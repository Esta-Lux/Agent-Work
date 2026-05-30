import type { DeploymentReadinessResult } from "@/lib/security/types";
import type { WorkspaceFixReport } from "@/lib/workspace/workspace-types";

export interface PreflightCheck {
  label: string;
  ok: boolean;
  warning?: boolean;
}

export function buildPrPreflight(input: {
  report: WorkspaceFixReport | null;
  changedFiles: string[];
  securityScore: number | null;
  securityCriticalCount: number | null;
  deploymentReadiness: DeploymentReadinessResult | null;
}): PreflightCheck[] {
  return [
    { label: "Patch approved", ok: input.report?.approvalStatus === "approved" },
    { label: "Files changed", ok: input.changedFiles.length > 0 },
    {
      label: "Completion evaluator passed",
      ok: !(input.report?.controlLayer?.taskCompletion?.blocked ?? false),
      warning: !input.report?.controlLayer?.taskCompletion
    },
    { label: "Vague Output Guard passed", ok: !(input.report?.controlLayer?.vagueOutput?.blocked ?? false) },
    { label: "Reachability passed", ok: true },
    {
      label: "Security scan",
      ok: typeof input.securityScore === "number" && (input.securityCriticalCount ?? 0) === 0,
      warning: typeof input.securityScore !== "number" || (input.securityCriticalCount ?? 0) === 0
    },
    {
      label: "Deploy readiness",
      ok: input.deploymentReadiness?.status === "production_candidate" || input.deploymentReadiness?.status === "production_ready" || input.deploymentReadiness?.status === "safe_for_staging",
      warning: input.deploymentReadiness?.status === "needs_review" || !input.deploymentReadiness
    },
    { label: "Verify run completed", ok: Boolean(input.report?.verificationSummary) }
  ];
}
