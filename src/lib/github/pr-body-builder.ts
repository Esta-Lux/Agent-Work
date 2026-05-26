import type { ControlLayerSummary } from "@/lib/control/types";
import type { PendingFixRecord } from "@/lib/workspace/pending-fix-store";
import type { WorkspaceFixReport } from "@/lib/workspace/workspace-types";

export function buildBootRisePrBodyFromPendingFix(pending: PendingFixRecord): string {
  const control = pending.controlLayer;
  const scope = control?.scopeContract;
  const patchGuard = control?.patchGuard;
  const patches = pending.patches ?? [];

  return `# BootRise Draft PR

## User Request
${pending.request}

## Interpreted Goal
${pending.plan.intent.interpretedGoal}

## Files Changed
${patches.map((p) => `- \`${p.path}\` — ${p.summary ?? "patch"}`).join("\n") || "—"}

## Scope Contract
Allowed edit files:
${scope?.allowedEditFiles.map((f) => `- ${f}`).join("\n") ?? "—"}

Forbidden zones:
${scope?.forbiddenPatterns.map((f) => `- ${f}`).join("\n") ?? "—"}

Diff budget: max ${scope?.maxFilesChanged ?? "—"} files, ${scope?.maxLinesChanged ?? "—"} lines

## Guard Results
${formatGuardSection(control)}

## Token / Cost Transparency
${control?.tokenEstimate ? `Context ~${control.tokenEstimate.contextChars} chars, patch ~${control.tokenEstimate.patchChars} chars, est. $${control.tokenEstimate.estimatedUsd.toFixed(4)}` : "See BootRise workspace for estimates."}

## Rollback Strategy
Revert this branch or reset to \`${scope?.scopeLockMessage ? "base" : "main"}\` if CI verification fails.

## Reviewer Checklist
- [ ] Confirm scope matches request
- [ ] Review patch guard / hallucination findings
- [ ] Run tests and typecheck
- [ ] Confirm env vars and migrations
- [ ] Security scan before production
`;
}

function formatGuardSection(control: ControlLayerSummary | undefined): string {
  if (!control) return "- Control layer summary not persisted — review in BootRise workspace.";
  const patchGuard = control.patchGuard;
  const hallucination = patchGuard.findings.filter((f) => f.category === "hallucination");
  return `- Context Gate: ${control.contextGate.status} (${control.contextGate.confidence}% confidence)
- Patch Guard: ${patchGuard.passed ? "passed" : "blocked"} (${patchGuard.filesChanged} files)
- Hallucination findings: ${hallucination.length ? hallucination.map((f) => f.message).join("; ") : "none"}
- Regression Guard: ${control.regressionGuard.passed ? "passed" : "needs review"}
- Agent council: ${control.agentCoordination.leadSummary}`;
}

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
