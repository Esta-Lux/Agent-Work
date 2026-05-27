"use client";

import { CommandCard } from "@/components/ui/command-card";
import { ModelModePill } from "@/components/ui/model-mode-pill";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import type { DeploymentReadinessResult } from "@/lib/security/types";
import type { WorkspaceFixReport } from "@/lib/workspace/workspace-types";

export function WorkspaceCommandCenter({
  projectName,
  report,
  creditsRemaining,
  modelMode,
  securityBlockers,
  deployReadinessStatus,
  liveSafeToDeploy,
  brainSummary,
  nextAction
}: {
  projectName: string;
  report: WorkspaceFixReport | null;
  creditsRemaining: number | null;
  modelMode: string;
  securityBlockers: number;
  deployReadinessStatus?: DeploymentReadinessResult["status"] | null;
  liveSafeToDeploy?: boolean;
  brainSummary?: { files: number; modules: number; stale: number } | null;
  nextAction: {
    label: string;
    helper: string;
    onClick: () => void;
    disabled?: boolean;
  };
}) {
  const control = report?.controlLayer;
  const safeToPr = report?.safeToPr?.status === "yes";
  const scopeLocked = Boolean(control?.scopeContract);
  const safeToDeploy = control
    ? control.agentCoordination.safeToDeploy
    : deployReadinessStatus != null || securityBlockers > 0
      ? Boolean(liveSafeToDeploy) && deployReadinessStatus !== "blocked" && securityBlockers === 0
      : false;
  const deployLabel = control
    ? safeToDeploy
      ? "Candidate"
      : "Blocked"
    : deployReadinessStatus != null || securityBlockers > 0
      ? safeToDeploy
        ? "Candidate"
        : "Blocked"
      : "Run scan";

  return (
    <div className="mb-6 rounded-2xl border border-line bg-gradient-to-br from-white via-white to-signal/5 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-signal">BootRise Command Center</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">Project: {projectName || "Untitled"}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ModelModePill mode={modelMode} />
          <Button type="button" size="sm" variant="dark" onClick={nextAction.onClick} disabled={nextAction.disabled}>
            {nextAction.label}
          </Button>
        </div>
      </div>
      <p className="mt-3 rounded-xl border border-signal/20 bg-signal/10 px-3 py-2 text-sm text-graphite">
        <span className="font-semibold text-ink">Next best action:</span> {nextAction.helper}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <CommandCard
          title="Brain"
          value={
            brainSummary
              ? `${brainSummary.files} files / ${brainSummary.modules} modules`
              : "Not indexed"
          }
          hint={brainSummary?.stale ? `${brainSummary.stale} stale` : undefined}
        />
        <CommandCard
          title="Control"
          value={scopeLocked ? "Scope locked" : control ? "Active" : "Idle"}
          hint={control?.contextGate.status.replace(/_/g, " ")}
        />
        <CommandCard
          title="Security"
          value={securityBlockers > 0 ? `${securityBlockers} blocker(s)` : "No blockers"}
        />
        <CommandCard
          title="Safe to PR"
          value={safeToPr ? "Yes" : "Not yet"}
        />
        <CommandCard
          title="Safe to deploy"
          value={deployLabel}
          hint={
            deployReadinessStatus && !control
              ? deployReadinessStatus.replace(/_/g, " ")
              : undefined
          }
        />
        <CommandCard
          title="Credits"
          value={creditsRemaining != null ? creditsRemaining.toLocaleString() : "—"}
          hint="remaining"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {report?.approvalStatus === "approved" ? <StatusPill label="Fix approved" tone="success" /> : null}
        {control && !control.canApprove ? <StatusPill label="Approval blocked" tone="warning" /> : null}
        {report?.safeToPr ? (
          <StatusPill label={report.safeToPr.label} tone={report.safeToPr.status === "yes" ? "success" : "warning"} />
        ) : null}
      </div>
    </div>
  );
}
