import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { SecurityFinding } from "@/lib/security/types";
import { createFindingCollector } from "@/lib/security/scan-context";
import { scanSecrets } from "@/lib/security/secrets-scanner";
import { scanClientServerBoundary } from "@/lib/security/client-server-boundary-scanner";
import { scanAuthz } from "@/lib/security/authz-scanner";
import { scanApiRoutes } from "@/lib/security/api-route-scanner";
import { scanSupabaseRls } from "@/lib/security/supabase-rls-scanner";
import { scanStripe } from "@/lib/security/stripe-scanner";
import { scanLoggingLeaks } from "@/lib/security/logging-leak-scanner";
import { scanDeploymentConfig } from "@/lib/security/deployment-config-scanner";
import { scanDependencies } from "@/lib/security/dependency-scanner";
import { computeSecurityScore } from "@/lib/security/security-score";
import { runSemgrepScan } from "@/lib/security/semgrep-runner";

export function runDeterministicSecurityScan(files: SourceFileInput[]): SecurityFinding[] {
  const { findings, add } = createFindingCollector();
  const ctx = { files, add };

  scanSecrets(ctx);
  scanClientServerBoundary(ctx);
  scanAuthz(ctx);
  scanApiRoutes(ctx);
  scanSupabaseRls(ctx);
  scanStripe(ctx);
  scanLoggingLeaks(ctx);
  scanDeploymentConfig(ctx);
  scanDependencies(ctx);

  return findings;
}

/** Deterministic BootRise scanners only (sync). */
export function runSecurityScan(files: SourceFileInput[]): SecurityFinding[] {
  return runDeterministicSecurityScan(files);
}

export async function runSecurityScanFull(files: SourceFileInput[]): Promise<{
  findings: SecurityFinding[];
  score: number;
  semgrep: { ran: boolean; skippedReason?: string; count: number };
}> {
  const deterministic = runDeterministicSecurityScan(files);
  const semgrep = runSemgrepScan(files);
  const byId = new Map<string, SecurityFinding>();
  for (const f of [...deterministic, ...semgrep.findings]) {
    byId.set(f.id, f);
  }
  const findings = [...byId.values()];
  return {
    findings,
    score: computeSecurityScore(findings),
    semgrep: { ran: semgrep.ran, skippedReason: semgrep.skippedReason, count: semgrep.findings.length }
  };
}

export function runSecurityScanWithScore(files: SourceFileInput[]): {
  findings: SecurityFinding[];
  score: number;
} {
  const findings = runDeterministicSecurityScan(files);
  return { findings, score: computeSecurityScore(findings) };
}
