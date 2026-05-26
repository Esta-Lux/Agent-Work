import type { WorkspaceFixReport } from "@/lib/workspace/workspace-types";

export function buildBootRisePrBody(report: WorkspaceFixReport, userRequest: string): string {
  const control = report.controlLayer;
  const scope = control?.scopeContract;
  const patchGuard = control?.patchGuard;
  const security = (control as { securityGuard?: { passed?: boolean; criticalCount?: number } } | undefined)
    ?.securityGuard;
  const patches = report.patches ?? [];

  return `# BootRise Draft PR

## User Request
${userRequest}

## Interpreted Scope
${report.plan.intent.interpretedGoal}

## Files Changed
${patches.map((p) => `- \`${p.path}\` — ${p.summary}`).join("\n") || report.fixed.map((f) => `- \`${f.path}\``).join("\n")}

## Scope Contract
Allowed edit files:
${scope?.allowedEditFiles.map((f) => `- ${f}`).join("\n") ?? "—"}

Forbidden zones:
${scope?.forbiddenPatterns.map((f) => `- ${f}`).join("\n") ?? "—"}

## Guard Results
- Patch Guard: ${patchGuard?.passed ? "passed" : "blocked"}
- Hallucination Guard: ${patchGuard?.findings.some((f) => f.category === "hallucination") ? "findings" : "clean"}
- Security Guard: ${security?.passed !== false ? "passed" : `${security?.criticalCount ?? 0} critical`}
- Regression Guard: ${control?.regressionGuard.passed ? "passed" : "review"}

## Verification
${report.verificationSummary.commands.join(", ") || "Run CI tests"}

## Safe-to-PR
${report.safeToPr?.label ?? "Review required"} — ${report.safeToPr?.status ?? "caution"}

## Deployment Readiness
Review security scan before production deploy.

## Rollback Notes
Revert this branch or reset to base if verification fails in CI.

## Reviewer Checklist
- [ ] Confirm scope
- [ ] Review security findings
- [ ] Run tests
- [ ] Confirm env vars
`;
}
