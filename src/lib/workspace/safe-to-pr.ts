import type { WorkspaceFixReport } from "@/lib/workspace/workspace-types";

export type SafeToPrStatus = "yes" | "caution" | "no";

export interface SafeToPrVerdict {
  status: SafeToPrStatus;
  label: string;
  reasons: string[];
}

export function computeSafeToPr(input: {
  report: WorkspaceFixReport;
  sandboxPassed?: boolean;
  hasRealRepoPatches?: boolean;
}): SafeToPrVerdict {
  const reasons: string[] = [];
  const isPreviewScaffold = input.report.fixed.some((f) => f.path.startsWith("generated/"));
  const risk = input.report.plan.risk.level;

  if (input.report.approvalStatus === "pending_approval") {
    return {
      status: "no",
      label: "Awaiting approval",
      reasons: [
        "Patches are proposed but not applied to your workspace yet.",
        "Click Approve to apply real file changes, then run sandbox verify."
      ]
    };
  }

  if (input.report.approvalStatus === "rejected") {
    return {
      status: "no",
      label: "Plan rejected",
      reasons: ["Create a new fix request with a clearer description."]
    };
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
          ]
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

  if (risk === "high" || !input.sandboxPassed) {
    return {
      status: "no",
      label: "No — address risks first",
      reasons: reasons.length ? reasons : ["Complete sandbox verify and lower risk before opening a PR."]
    };
  }

  if (risk === "medium" || input.report.potentiallyBroken.length > 3) {
    return {
      status: "caution",
      label: "Review first",
      reasons: [
        "Medium risk or wide blast radius — run tests on affected modules before merge.",
        ...reasons.slice(0, 2)
      ]
    };
  }

  return {
    status: "yes",
    label: "Likely safe after your review",
    reasons: [
      "Low-risk plan with sandbox checks passed.",
      "Still run your own CI and device QA before merge."
    ]
  };
}
