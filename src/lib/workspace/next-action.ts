/**
 * Next Best Action engine for the BootRise workspace.
 *
 * Given a snapshot of the workspace state, returns a single primary
 * action the operator should take. The Command Center v2 renders this
 * as the only dark primary CTA on the page.
 *
 * Pure function. No React, no fetches. Safe for tests and SSR.
 */

import type { WorkspaceFixReport } from "@/lib/workspace/workspace-types";

export type WorkspaceTab =
  | "overview"
  | "connect"
  | "files"
  | "fix"
  | "verify"
  | "export"
  | "architecture"
  | "brain"
  | "control"
  | "security"
  | "ledger";

export type NextActionSeverity = "info" | "primary" | "warning" | "critical";

export interface NextAction {
  /** Short imperative label, e.g. "Connect repo". */
  label: string;
  /** Plain-language reason the operator should do this now. */
  reason: string;
  /** Where in the workspace the action takes them. */
  targetTab: WorkspaceTab;
  /** When true, render as dimmed and non-clickable. */
  disabled: boolean;
  /** Visual severity. Command Center always uses primary unless blocked. */
  severity: NextActionSeverity;
}

export interface NextActionInput {
  /** Repo has been imported (files in workspace). */
  repoConnected: boolean;
  /** Project brain index has been built. */
  brainIndexed: boolean;
  /** Product brief is complete enough to plan. */
  briefReady: boolean;
  /** Fix report exists in current session. */
  hasFixReport: boolean;
  /** Fix report is pending approval. */
  fixPendingApproval: boolean;
  /** Control layer blocked approval (context gate / patch guard). */
  controlBlocked: boolean;
  /** Active patch has been approved by the operator. */
  patchApproved: boolean;
  /** Sandbox / verify produced passing evidence. */
  verificationPassed: boolean;
  /** Security blockers detected by the scanner. */
  securityBlockers: number;
  /** PR / bundle export already produced. */
  exportComplete: boolean;
  /** AI provider not configured (offline mode). Affects messaging only. */
  providerOffline?: boolean;
  /** Reason from control layer when block. */
  controlStopReason?: string;
}

export function computeNextAction(input: NextActionInput): NextAction {
  if (!input.repoConnected) {
    return {
      label: "Connect repo",
      reason: "Import a GitHub repo or upload files so BootRise can build context.",
      targetTab: "connect",
      disabled: false,
      severity: "primary"
    };
  }

  if (input.securityBlockers > 0) {
    return {
      label: "Review security",
      reason: `${input.securityBlockers} security blocker${input.securityBlockers > 1 ? "s" : ""} detected — resolve before merging.`,
      targetTab: "security",
      disabled: false,
      severity: "critical"
    };
  }

  if (!input.briefReady) {
    return {
      label: "Complete brief",
      reason: "Add product name and primary workflow so BootRise can plan changes accurately.",
      targetTab: "files",
      disabled: false,
      severity: "primary"
    };
  }

  if (input.controlBlocked) {
    return {
      label: "Resolve control block",
      reason: input.controlStopReason || "The control layer paused approval. Provide the missing context to continue.",
      targetTab: "fix",
      disabled: false,
      severity: "warning"
    };
  }

  if (input.fixPendingApproval) {
    return {
      label: "Review approval",
      reason: "A patch is awaiting your approval. Inspect the scope, blast radius and diff before applying.",
      targetTab: "fix",
      disabled: false,
      severity: "primary"
    };
  }

  if (!input.hasFixReport) {
    return {
      label: "Run Fix",
      reason: input.providerOffline
        ? "Describe a narrow change and run the deterministic Fix pipeline (offline mode)."
        : "Describe a narrow change and run the controlled Fix pipeline.",
      targetTab: "fix",
      disabled: false,
      severity: "primary"
    };
  }

  if (input.patchApproved && !input.verificationPassed) {
    return {
      label: "Verify",
      reason: "Approved patch is applied — confirm it builds in the sandbox before opening a PR.",
      targetTab: "verify",
      disabled: false,
      severity: "primary"
    };
  }

  if (input.verificationPassed && !input.exportComplete) {
    return {
      label: "Open PR / Export",
      reason: "Verification passed. Open a draft PR or download the BootRise bundle.",
      targetTab: "export",
      disabled: false,
      severity: "primary"
    };
  }

  if (input.exportComplete) {
    return {
      label: "Start next change",
      reason: "Last change is exported. Plan another scoped fix or review intelligence panels.",
      targetTab: "fix",
      disabled: false,
      severity: "info"
    };
  }

  return {
    label: "Open Fix",
    reason: "Pick the next scoped change to ship.",
    targetTab: "fix",
    disabled: false,
    severity: "primary"
  };
}

/**
 * Adapter: build NextActionInput from the current `WorkspaceFixReport`
 * plus the simple booleans the workspace tracks. Keeps next-action
 * decoupled from the heavy workspace types.
 */
export function buildNextActionInput(args: {
  fileCount: number;
  briefReady: boolean;
  brainIndexedFiles?: number;
  report: WorkspaceFixReport | null;
  sandboxPassed: boolean;
  exportDone: boolean;
  securityBlockers: number;
  providerConfigured: boolean;
}): NextActionInput {
  const control = args.report?.controlLayer ?? null;
  const fixPendingApproval = args.report?.approvalStatus === "pending_approval";
  const patchApproved = args.report?.approvalStatus === "approved";
  return {
    repoConnected: args.fileCount > 0,
    brainIndexed: (args.brainIndexedFiles ?? 0) > 0,
    briefReady: args.briefReady,
    hasFixReport: Boolean(args.report),
    fixPendingApproval,
    controlBlocked: Boolean(control && !control.canApprove),
    controlStopReason: control?.stopReason ?? undefined,
    patchApproved,
    verificationPassed: args.sandboxPassed,
    securityBlockers: args.securityBlockers,
    exportComplete: args.exportDone,
    providerOffline: !args.providerConfigured
  };
}
