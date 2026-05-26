import type { SecurityFinding } from "@/lib/security/types";

export function computeSecurityScore(findings: SecurityFinding[]): number {
  let score = 100;
  for (const f of findings) {
    if (f.severity === "critical") score -= 25;
    else if (f.severity === "high") score -= 12;
    else if (f.severity === "medium") score -= 5;
    else score -= 2;
  }
  return Math.max(0, Math.min(100, score));
}
