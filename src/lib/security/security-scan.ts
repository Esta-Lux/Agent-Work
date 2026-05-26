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

export function runSecurityScan(files: SourceFileInput[]): SecurityFinding[] {
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

export function runSecurityScanWithScore(files: SourceFileInput[]): {
  findings: SecurityFinding[];
  score: number;
} {
  const findings = runSecurityScan(files);
  return { findings, score: computeSecurityScore(findings) };
}
