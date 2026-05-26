import type { WorkspaceFixReport } from "@/lib/workspace/workspace-types";

export type SafeToPrStatus = "yes" | "caution" | "no";

export interface SafeToPrVerdict {
  status: SafeToPrStatus;
  label: string;
  reasons: string[];
  checklist: string[];
}

export function computeSafeToPr(input: {
  report: WorkspaceFixReport;
  sandboxPassed?: boolean;
  hasRealRepoPatches?: boolean;
}): SafeToPrVerdict {
  const reasons: string[] = [];
  const checklist: string[] = [];
  const control = input.report.controlLayer;
  const isPreviewScaffold = input.report.fixed.some((f) => f.path.startsWith("generated/"));
  const risk = input.report.plan.risk.level;

  checklist.push("Approved scope and patch plan");
  checklist.push("No hallucinated imports or forbidden files");
  checklist.push("Diff budget respected");
  checklist.push("Regression shield passed");
  checklist.push("Sandbox verify passed or explicitly waived");
  checklist.push("Rollback plan documented");

  if (input.report.approvalStatus === "pending_approval") {
    const controlBlocked = control && !control.canApprove;
    return {
      status: "no",
      label: controlBlocked ? "Control layer blocked" : "Awaiting approval",
      reasons: controlBlocked
        ? [
            control.stopReason ?? "Patch guard found blocking issues.",
            "Fix scope or diff budget before approving."
          ]
        : [
            "Patches are proposed but not applied to your workspace yet.",
            "Review the control layer panel, then approve and run sandbox verify."
          ],
      checklist: checklist.map((item) =>
        item.startsWith("Approved") ? "⏳ Pending user approval" : `⏳ ${item}`
      )
    };
  }

  if (input.report.approvalStatus === "rejected") {
    return {
      status: "no",
      label: "Plan rejected",
      reasons: ["Create a new fix request with a clearer description."],
      checklist: checklist.map((item) => `✗ ${item}`)
    };
  }

  if (control && !control.canApprove) {
    return {
      status: "no",
      label: "Control layer blocked",
      reasons: [control.stopReason ?? "Patch guard or stop policy blocked this change."],
      checklist
    };
  }

  if (control?.patchGuard.blocked) {
    return {
      status: "no",
      label: "Patch guard failed",
      reasons: control.patchGuard.findings.filter((f) => f.severity === "block").map((f) => f.message),
      checklist
    };
  }

  if (control && control.patchGuard.forbiddenTouched.length > 0) {
    reasons.push(`Forbidden zones touched: ${control.patchGuard.forbiddenTouched.join(", ")}`);
  }

  if (!input.report.plan.rollbackStrategy?.trim()) {
    reasons.push("Rollback strategy missing from plan.");
  }

  if (isPreviewScaffold || !input.hasRealRepoPatches) {
    return {
      status: "no",
      label: "Not yet — no applied patches",
      reasons: isPreviewScaffold
        ? [
            "This run produced generated preview files only, not edits to your imported paths.",
            "Re-run Fix with a clearer file-specific request."
          ]
        : [
            "Patches have not been applied to your workspace yet.",
            "Approve the plan, then run sandbox verify for build proof."
          ],
      checklist
    };
  }

  if (risk === "high") {
    reasons.push("Plan is marked high risk.");
  }

  if (!input.sandboxPassed) {
    reasons.push("Sandbox verify has not passed on this workspace.");
  }

  if (input.report.residualRisk.length > 0) {
    reasons.push(`${input.report.residualRisk.length} residual risk item(s) remain.`);
  }

  const verificationFailed = input.report.verificationSummary?.checks?.some((c) => c.status === "failed");
  if (verificationFailed) {
    reasons.push("One or more verification checks failed.");
  }

  if (risk === "high" || !input.sandboxPassed || verificationFailed) {
    return {
      status: "no",
      label: "No — address risks first",
      reasons: reasons.length ? reasons : ["Complete sandbox verify and lower risk before opening a PR."],
      checklist: checklist.map((item) =>
        item.includes("Sandbox") && !input.sandboxPassed ? `✗ ${item}` : `⚠ ${item}`
      )
    };
  }

  if (risk === "medium" || input.report.potentiallyBroken.length > 3) {
    return {
      status: "caution",
      label: "Review first",
      reasons: [
        "Medium risk or wide blast radius — run tests on affected modules before merge.",
        ...reasons.slice(0, 2)
      ],
      checklist: checklist.map((item) => `⚠ ${item}`)
    };
  }

  return {
    status: "yes",
    label: "Likely safe after your review",
    reasons: [
      "Low-risk plan with sandbox checks passed.",
      "Control layer, diff budget, and regression shield are clear.",
      "Still run your own CI and device QA before merge."
    ],
    checklist: checklist.map((item) => `✓ ${item}`)
  };
}
