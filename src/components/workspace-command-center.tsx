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
  const mission = nextAction.helper;

  return (
    <div className="mb-5 overflow-hidden rounded-[1.75rem] border border-line bg-[radial-gradient(circle_at_top_left,rgba(60,214,160,0.18),transparent_36%),linear-gradient(135deg,#ffffff,#f7fbfa)] shadow-sm">
      <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-signal">BootRise Command Center</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h2 className="truncate text-2xl font-semibold tracking-tight text-ink">Project: {projectName || "Untitled"}</h2>
            <ModelModePill mode={modelMode} />
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-graphite">
            <span className="font-semibold text-ink">Next:</span> {mission}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:min-w-52">
          <Button type="button" size="sm" variant="dark" onClick={nextAction.onClick} disabled={nextAction.disabled}>
            {nextAction.label}
          </Button>
          <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-steel">single primary action</p>
        </div>
      </div>
      <div className="grid border-t border-line bg-white/70 sm:grid-cols-2 lg:grid-cols-6">
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
      <div className="flex flex-wrap gap-2 border-t border-line bg-white/80 px-5 py-3">
        {report?.approvalStatus === "approved" ? <StatusPill label="Fix approved" tone="success" /> : null}
        {control && !control.canApprove ? <StatusPill label="Approval blocked" tone="warning" /> : null}
        {report?.safeToPr ? (
          <StatusPill label={report.safeToPr.label} tone={report.safeToPr.status === "yes" ? "success" : "warning"} />
        ) : null}
      </div>
    </div>
  );
}
