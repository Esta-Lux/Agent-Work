import type { SecurityFinding } from "@/lib/security/types";

export type ReviewFindingSeverity = "critical" | "high" | "medium" | "low";

export interface ReviewFinding {
  id: string;
  priority: number;
  area: string;
  title: string;
  severity: ReviewFindingSeverity;
  paths: string[];
  detail: string;
  suggestedAction: string;
  source: "deterministic" | "security" | "semgrep" | "multi_pass";
}

const SEVERITY_WEIGHT: Record<ReviewFindingSeverity, number> = {
  critical: 100,
  high: 70,
  medium: 40,
  low: 15
};

export function prioritizeReviewFindings(findings: ReviewFinding[]): ReviewFinding[] {
  return [...findings]
    .sort((a, b) => a.priority - b.priority || SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity])
    .map((f, index) => ({ ...f, priority: index + 1 }));
}

export function fromDeterministicFindings(
  findings: Array<{
    area: string;
    title: string;
    severity: "high" | "medium" | "low";
    paths: string[];
    detail: string;
  }>
): ReviewFinding[] {
  return findings.map((f, i) => ({
    id: `det:${f.area}:${i}`,
    priority: 0,
    area: f.area,
    title: f.title,
    severity: f.severity === "high" ? "high" : f.severity === "medium" ? "medium" : "low",
    paths: f.paths,
    detail: f.detail,
    suggestedAction: "Run Fix on this area with a narrow, file-specific request.",
    source: "deterministic"
  }));
}

export function fromSecurityFindings(findings: SecurityFinding[], source: "security" | "semgrep" = "security"): ReviewFinding[] {
  return findings.map((f) => ({
    id: f.id,
    priority: 0,
    area: f.category,
    title: f.title,
    severity: f.severity,
    paths: f.file ? [f.file] : [],
    detail: f.whyItMatters,
    suggestedAction: f.recommendedFix,
    source
  }));
}

export function mergeReviewFindings(...groups: ReviewFinding[][]): ReviewFinding[] {
  const seen = new Set<string>();
  const merged: ReviewFinding[] = [];
  for (const group of groups) {
    for (const f of group) {
      const key = `${f.source}:${f.title}:${f.paths.join(",")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(f);
    }
  }
  return prioritizeReviewFindings(merged);
}

export function formatReviewFindingsBlock(findings: ReviewFinding[], max = 8): string {
  if (!findings.length) return "";
  const lines = ["PRIORITIZED FINDINGS (RepoReviewer-style):"];
  for (const f of findings.slice(0, max)) {
    lines.push(
      `${f.priority}. [${f.severity}] ${f.title} (${f.area})`,
      `   ${f.detail}`,
      f.paths.length ? `   Files: ${f.paths.slice(0, 4).join(", ")}` : "",
      `   Next: ${f.suggestedAction}`
    );
  }
  return lines.filter(Boolean).join("\n");
}
