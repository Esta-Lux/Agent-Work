"use client";

import { CommandButton } from "@/components/ui/command-button";
import { ModePopover, type WorkspaceProvider, type WorkspaceRole, type WorkspaceSpeed } from "@/components/workspace/mode-popover";
import type { WorkspaceV2Step } from "@/components/workspace/workflow-rail-v2";

interface WorkspaceCommandStripProps {
  projectName: string;
  repoConnected: boolean;
  activeStep: WorkspaceV2Step;
  creditsRemaining: number | null;
  brainIndexed: boolean;
  controlBlocked: boolean;
  securityBlockers: number;
  safeToPr: boolean;
  deployStatus: "unknown" | "ready" | "failed";
  busy: boolean;
  role: WorkspaceRole;
  provider: WorkspaceProvider;
  speed: WorkspaceSpeed;
  onRoleChange: (role: WorkspaceRole) => void;
  onProviderChange: (provider: WorkspaceProvider) => void;
  onSpeedChange: (speed: WorkspaceSpeed) => void;
  onPrimaryAction: () => void;
  onShowOnboarding?: () => void;
}

const actionLabel: Record<WorkspaceV2Step, string> = {
  connect: "Connect repo",
  brief: "Complete brief",
  fix: "Run Fix",
  verify: "Run Verify",
  export: "Export bundle"
};

export function WorkspaceCommandStrip({
  projectName,
  repoConnected,
  activeStep,
  creditsRemaining,
  brainIndexed,
  controlBlocked,
  securityBlockers,
  safeToPr,
  deployStatus,
  busy,
  role,
  provider,
  speed,
  onRoleChange,
  onProviderChange,
  onSpeedChange,
  onPrimaryAction,
  onShowOnboarding
}: WorkspaceCommandStripProps) {
  const creditsLabel = typeof creditsRemaining === "number" ? creditsRemaining.toLocaleString() : "-";
  const nextAction =
    repoConnected && activeStep !== "connect"
      ? `${actionLabel[activeStep]} is the next safe step.`
      : "Connect a GitHub repository or upload files to begin.";

  return (
    <section data-tour="command-center" className="border-b border-border-ws bg-gradient-to-r from-card-ws to-signal-glow px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[9px] font-medium uppercase tracking-widest text-signal-text">BootRise Command Center</p>
          <h1 className="mt-1 truncate font-serif text-[22px] italic text-text-ws-1">{projectName || "Untitled workspace"}</h1>
          <p className="mt-1 text-xs text-text-ws-2">{nextAction}</p>
        </div>
        <div className="flex items-center gap-2">
          {onShowOnboarding ? <CommandButton theme="workspace" variant="ghost" size="sm" label="Guide" onClick={onShowOnboarding} /> : null}
          <ModePopover role={role} provider={provider} speed={speed} onRoleChange={onRoleChange} onProviderChange={onProviderChange} onSpeedChange={onSpeedChange} />
          <CommandButton theme="workspace" variant="primary" size="lg" label={repoConnected ? actionLabel[activeStep] : "Connect repo"} loading={busy} onClick={onPrimaryAction} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-6 gap-px overflow-hidden rounded-lg border border-border-ws bg-border-ws">
        <Metric label="Brain" value={!repoConnected ? "-" : brainIndexed ? "Indexed" : "Not indexed"} tone={!repoConnected ? "muted" : brainIndexed ? "signal" : "muted"} />
        <Metric label="Control" value={controlBlocked ? "Blocked" : "Idle"} tone={controlBlocked ? "amber" : "signal"} />
        <Metric label="Security" value={securityBlockers > 0 ? "Blockers found" : "Clear"} tone={securityBlockers > 0 ? "red" : "signal"} />
        <Metric label="Safe to PR" value={!repoConnected ? "-" : safeToPr ? "Ready" : "Not yet"} tone={!repoConnected ? "muted" : safeToPr ? "signal" : "amber"} />
        <Metric label="Safe to deploy" value={!repoConnected ? "-" : deployStatus === "unknown" ? "Run scan" : deployStatus === "ready" ? "Ready" : "Failed"} tone={!repoConnected || deployStatus === "unknown" ? "muted" : deployStatus === "ready" ? "signal" : "red"} />
        <Metric label="Credits" value={creditsLabel} tone="signal" detail="remaining" />
      </div>
    </section>
  );
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone: "signal" | "amber" | "red" | "muted" }) {
  const valueClass = tone === "signal" ? "text-signal-text" : tone === "amber" ? "text-amber-400" : tone === "red" ? "text-red-400" : "text-text-ws-3";
  return (
    <div className="bg-panel-ws px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-widest text-text-ws-3">{label}</p>
      <p className={`mt-1 truncate text-sm font-semibold ${valueClass}`}>{value}</p>
      {detail ? <p className="text-[10px] text-text-ws-3">{detail}</p> : null}
    </div>
  );
}
