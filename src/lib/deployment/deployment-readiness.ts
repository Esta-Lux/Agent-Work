import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { runDeterministicSecurityScan } from "@/lib/security/security-scan";
import { runSemgrepScan } from "@/lib/security/semgrep-runner";
import { computeSecurityScore } from "@/lib/security/security-score";
import type { DeploymentReadinessResult } from "@/lib/security/types";
import { hasGithubApiCredentials } from "@/lib/github/github-config";

export function evaluateDeploymentReadiness(files: SourceFileInput[]): DeploymentReadinessResult {
  const semgrep = runSemgrepScan(files);
  const byId = new Map<string, ReturnType<typeof runDeterministicSecurityScan>[number]>();
  for (const f of [...runDeterministicSecurityScan(files), ...semgrep.findings]) {
    byId.set(f.id, f);
  }
  const findings = [...byId.values()];
  const critical = findings.filter((f) => f.severity === "critical");
  const high = findings.filter((f) => f.severity === "high");
  const blockers = findings.filter((f) => f.blocksDeployment || f.severity === "critical");
  const warnings = findings.filter((f) => !blockers.includes(f));

  const passedChecks: string[] = [];
  if (!findings.some((f) => f.category === "secret" && f.severity === "critical")) {
    passedChecks.push("No critical secret exposures in scanned files");
  }
  if (!findings.some((f) => f.category === "auth" && f.severity === "critical")) {
    passedChecks.push("No critical auth gaps in scanned routes");
  }
  if (!findings.some((f) => f.category === "api" && f.severity === "high")) {
    passedChecks.push("No high-severity unauthenticated API patterns");
  }

  const missingProductionItems: string[] = [];
  if (!files.some((f) => /middleware\.ts/i.test(f.path))) {
    missingProductionItems.push("Session middleware (src/middleware.ts)");
  }
  if (!process.env.SUPABASE_URL?.trim()) {
    missingProductionItems.push("SUPABASE_URL in deployment environment");
  }
  if (!hasGithubApiCredentials()) {
    missingProductionItems.push(
      "GitHub App (GITHUB_APP_CLIENT_ID or GITHUB_APP_ID, plus private key) or GITHUB_TOKEN for draft PRs (optional)"
    );
  }

  const score = computeSecurityScore(findings);
  const hasRollbackDoc = files.some((f) => /rollback|revert/i.test(f.content));

  let status: DeploymentReadinessResult["status"];
  if (critical.length > 0) {
    status = "blocked";
  } else if (high.length > 0) {
    status = "needs_review";
  } else if (score >= 92 && missingProductionItems.length === 0 && hasRollbackDoc) {
    status = "production_ready";
  } else if (score >= 80 && missingProductionItems.length <= 1) {
    status = "production_candidate";
  } else if (score >= 65) {
    status = "safe_for_staging";
  } else {
    status = "needs_review";
  }

  return { score, status, blockers, warnings, passedChecks, missingProductionItems };
}
