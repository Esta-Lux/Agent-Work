import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { runSecurityScanFull } from "@/lib/security/security-scan";
import type { DetectionDraft } from "@/lib/admin/detections/types";

export async function ruleSecurityFindings(input: { files: SourceFileInput[] }): Promise<DetectionDraft[]> {
  if (input.files.length === 0) return [];
  const result = await runSecurityScanFull(input.files);
  const drafts: DetectionDraft[] = [];
  for (const finding of result.findings) {
    if (finding.severity !== "high" && finding.severity !== "critical") continue;
    drafts.push({
      kind: "security_finding",
      severity: finding.severity === "critical" ? "critical" : "warning",
      title: `Security finding: ${finding.title}`,
      description: finding.whyItMatters.slice(0, 240),
      affectedPaths: finding.file ? [finding.file] : undefined,
      evidence: {
        ruleId: finding.id,
        category: finding.category,
        path: finding.file ?? ""
      },
      suggestedAction: finding.recommendedFix.slice(0, 240),
      suggestedFixRequest: `Apply security fix: ${finding.recommendedFix.slice(0, 200)} (rule ${finding.id}${finding.file ? `, ${finding.file}` : ""}).`,
      source: "scanner"
    });
  }
  return drafts;
}
