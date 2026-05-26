import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { runSecurityScan } from "@/lib/security/security-scan";
import type { DeploymentReadinessResult } from "@/lib/security/types";

export function evaluateDeploymentReadiness(files: SourceFileInput[]): DeploymentReadinessResult {
  const findings = runSecurityScan(files);
  const blockers = findings.filter((f) => f.blocksDeployment || f.severity === "critical");
  const warnings = findings.filter((f) => !blockers.includes(f));
  const passedChecks: string[] = [];

  if (!findings.some((f) => f.category === "secret")) passedChecks.push("No obvious secrets in scanned files");
  if (!findings.some((f) => f.category === "auth" && f.severity === "critical")) passedChecks.push("No critical auth gaps detected");

  const missingProductionItems: string[] = [];
  if (!files.some((f) => f.path.includes("middleware"))) missingProductionItems.push("Session middleware");
  if (!process.env.SUPABASE_URL) missingProductionItems.push("SUPABASE_URL configured in deployment");

  let score = 100 - blockers.length * 25 - warnings.length * 5;
  score = Math.max(0, Math.min(100, score));

  const status: DeploymentReadinessResult["status"] =
    blockers.length > 0
      ? "blocked"
      : warnings.length > 3
        ? "needs_review"
        : score >= 85
          ? "production_candidate"
          : score >= 70
            ? "safe_for_staging"
            : "needs_review";

  return { score, status, blockers, warnings, passedChecks, missingProductionItems };
}
