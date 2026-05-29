"use client";

import { BlockerRow } from "@/components/ui/blocker-row";
import { CommandButton } from "@/components/ui/command-button";
import { StatusPill } from "@/components/ui/status-pill";
import { ArchitectureRoadmapPanel } from "@/components/workspace/architecture-roadmap-panel";
import type { WorkspaceProvider, WorkspaceSpeed } from "@/components/workspace/mode-popover";
import type { WorkspaceV2Step } from "@/components/workspace/workflow-rail-v2";
import type { ArchitectureRoadmap, ProjectBrief, WorkspaceFixReport } from "@/lib/workspace/workspace-types";

interface OperationPanelV2Props {
  activeStep: WorkspaceV2Step;
  repoConnected: boolean;
  githubUrl: string;
  githubBranch: string;
  githubBranches: string[];
  importMode: "full" | "key";
  projectName: string;
  brief: ProjectBrief;
  fixRequest: string;
  status: string;
  issue: string | null;
  provider: WorkspaceProvider;
  speed: WorkspaceSpeed;
  sandboxLog: string | null;
  exportMessage: string | null;
  roadmap: ArchitectureRoadmap | null;
  roadmapLoading: boolean;
  report: WorkspaceFixReport | null;
  draftPrMessage: string | null;
  busy: boolean;
  onGithubUrlChange: (value: string) => void;
  onGithubBranchChange: (value: string) => void;
  onImportModeChange: (value: "full" | "key") => void;
  onProjectNameChange: (value: string) => void;
  onBriefChange: (brief: ProjectBrief) => void;
  onFixRequestChange: (value: string) => void;
  onLoadBranches: () => void;
  onOpenDocs: () => void;
  onOpenDraftPr: () => void;
}

export function OperationPanelV2(props: OperationPanelV2Props) {
  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border-ws bg-panel-ws">
      <header className="border-b border-border-ws px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-text-ws-3">Context inspector</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold capitalize text-text-ws-1">{props.activeStep}</h2>
          {props.repoConnected ? <StatusPill variant="signal" label="repo loaded" /> : null}
        </div>
      </header>
      <div className="min-h-0 flex-1 p-4">
        {props.issue ? <div className="mb-3"><BlockerRow severity="warning" title="Needs attention" description={props.issue} /></div> : null}
        <div className="space-y-4">
          {props.activeStep === "connect" ? <ConnectStep {...props} /> : null}
          {props.activeStep === "brief" ? <BriefStep {...props} /> : null}
          {props.activeStep === "fix" ? <FixStep {...props} /> : null}
          {props.activeStep === "verify" ? <VerifyStep sandboxLog={props.sandboxLog} status={props.status} /> : null}
          {props.activeStep === "export" ? <ExportStep {...props} /> : null}
          <ArchitectureRoadmapPanel roadmap={props.roadmap} loading={props.roadmapLoading} />
        </div>
      </div>
    </aside>
  );
}

function ConnectStep({
  githubUrl,
  githubBranch,
  githubBranches,
  importMode,
  projectName,
  onGithubUrlChange,
  onGithubBranchChange,
  onImportModeChange,
  onProjectNameChange,
  onLoadBranches,
  onOpenDocs
}: OperationPanelV2Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-card-ws p-4">
        <p className="text-sm font-semibold text-text-ws-1">Start by connecting real code</p>
        <p className="mt-1 text-xs leading-5 text-text-ws-2">Import a GitHub repository so BootRise can index real files and guide the workflow.</p>
      </div>
      <Field label="GitHub URL">
        <input className="w-full rounded-lg border border-border-ws bg-card-ws px-3 py-2 font-mono text-xs text-text-ws-1 outline-none focus:border-signal/50" value={githubUrl} onChange={(event) => onGithubUrlChange(event.target.value)} placeholder="https://github.com/org/repo" />
      </Field>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Field label="Branch">
          <select className="w-full rounded-lg border border-border-ws bg-card-ws px-3 py-2 text-xs text-text-ws-1 outline-none" value={githubBranch} onChange={(event) => onGithubBranchChange(event.target.value)}>
            {[githubBranch, ...githubBranches.filter((branch) => branch !== githubBranch)].map((branch) => <option key={branch} value={branch}>{branch}</option>)}
          </select>
        </Field>
        <div className="pt-5"><CommandButton theme="workspace" variant="ghost" size="sm" label="Branches" onClick={onLoadBranches} /></div>
      </div>
      <Field label="Import mode">
        <div className="grid grid-cols-2 rounded-lg bg-card-ws p-1">
          {(["full", "key"] as const).map((mode) => (
            <button key={mode} type="button" onClick={() => onImportModeChange(mode)} className={`h-8 rounded-md text-xs font-medium ${importMode === mode ? "bg-signal text-white" : "text-text-ws-2"}`}>
              {mode === "full" ? "Full repo" : "Key files"}
            </button>
          ))}
        </div>
      </Field>
      <BlockerRow severity="warning" title="Public repos until GitHub App is configured" description="Private repository import requires the GitHub App client ID and installation flow." action={{ label: "View docs", onClick: onOpenDocs }} />
      <Field label="Project name">
        <input className="w-full rounded-lg border border-border-ws bg-card-ws px-3 py-2 text-xs text-text-ws-1 outline-none focus:border-signal/50" value={projectName} onChange={(event) => onProjectNameChange(event.target.value)} />
      </Field>
      <CommandButton theme="workspace" variant="secondary" size="md" label="Save to local disk" className="w-full" />
    </div>
  );
}

function BriefStep({ brief, onBriefChange }: OperationPanelV2Props) {
  return (
    <div className="space-y-4">
      <Field label="Product name">
        <input className="w-full rounded-lg border border-border-ws bg-card-ws px-3 py-2 text-sm text-text-ws-1 outline-none" value={brief.productName} onChange={(event) => onBriefChange({ ...brief, productName: event.target.value })} />
      </Field>
      <Field label="Audience">
        <input className="w-full rounded-lg border border-border-ws bg-card-ws px-3 py-2 text-sm text-text-ws-1 outline-none" value={brief.audience} onChange={(event) => onBriefChange({ ...brief, audience: event.target.value })} />
      </Field>
      <Field label="Primary workflow">
        <textarea className="min-h-24 w-full rounded-lg border border-border-ws bg-card-ws px-3 py-2 text-sm text-text-ws-1 outline-none" value={brief.primaryWorkflow} onChange={(event) => onBriefChange({ ...brief, primaryWorkflow: event.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Toggle label="Auth" checked={brief.authRequired} onChange={(checked) => onBriefChange({ ...brief, authRequired: checked })} />
        <Toggle label="Payments" checked={brief.paymentsRequired} onChange={(checked) => onBriefChange({ ...brief, paymentsRequired: checked })} />
      </div>
    </div>
  );
}

function FixStep({ fixRequest, onFixRequestChange, provider, speed }: OperationPanelV2Props) {
  return (
    <div className="space-y-4">
      <Field label="Fix request">
        <textarea className="min-h-32 w-full rounded-lg border border-border-ws bg-card-ws px-3 py-2 text-sm text-text-ws-1 outline-none" value={fixRequest} onChange={(event) => onFixRequestChange(event.target.value)} placeholder="Describe one scoped change..." />
      </Field>
      <div className="rounded-lg bg-card-ws p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-text-ws-1">Plan summary</p>
          <StatusPill variant={speed === "security" ? "amber" : "blue"} label={speed} />
        </div>
        <p className="mt-2 text-xs leading-5 text-text-ws-2">Provider: {provider === "openai" ? "ChatGPT" : "BootRise"}. Approval gate remains required before workspace changes are applied.</p>
      </div>
    </div>
  );
}

function VerifyStep({ sandboxLog, status }: { sandboxLog: string | null; status: string }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-card-ws p-4">
        <p className="text-sm font-semibold text-text-ws-1">Verification status</p>
        <p className="mt-1 text-xs text-text-ws-2">{status}</p>
      </div>
      {sandboxLog ? <pre className="max-h-72 overflow-auto rounded-lg bg-black/30 p-3 font-mono text-xs text-text-ws-2">{sandboxLog}</pre> : <BlockerRow severity="info" title="Sandbox verification" description="Run Verify after importing code. Configure E2B or Fly for deeper sandbox proof." />}
    </div>
  );
}

function ExportStep({
  exportMessage,
  draftPrMessage,
  report,
  githubUrl,
  busy,
  onOpenDraftPr
}: Pick<OperationPanelV2Props, "exportMessage" | "draftPrMessage" | "report" | "githubUrl" | "busy" | "onOpenDraftPr">) {
  const canOpenPr = Boolean(report?.approvalStatus === "approved" && githubUrl.trim());
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-card-ws p-4">
        <p className="text-sm font-semibold text-text-ws-1">Export bundle</p>
        <p className="mt-1 text-xs leading-5 text-text-ws-2">{exportMessage ?? "Export is available after the brief and repo files are ready."}</p>
      </div>
      <div className="rounded-lg bg-card-ws p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-text-ws-1">Safe to PR</p>
            <p className="mt-1 text-xs leading-5 text-text-ws-2">{report?.safeToPr?.label ?? "Run Fix and Verify first."}</p>
          </div>
          {report?.safeToPr?.status ? (
            <StatusPill
              variant={report.safeToPr.status === "yes" ? "signal" : report.safeToPr.status === "caution" ? "blue" : "amber"}
              label={report.safeToPr.status.replace(/_/g, " ")}
            />
          ) : null}
        </div>
        {report?.safeToPr?.checklist?.length ? (
          <ul className="mt-3 space-y-1 text-xs leading-5 text-text-ws-2">
            {report.safeToPr.checklist.slice(0, 4).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-3 flex flex-col gap-2">
          <CommandButton
            theme="workspace"
            variant="secondary"
            size="md"
            label="Open draft PR"
            className="w-full"
            disabled={!canOpenPr || busy}
            onClick={onOpenDraftPr}
          />
          <p className="text-xs leading-5 text-text-ws-2">
            {draftPrMessage ??
              (canOpenPr
                ? "BootRise will push the approved workspace patch to a branch and open a draft PR."
                : "Approve the patch against a connected GitHub repo before opening a draft PR.")}
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-text-ws-3">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`rounded-lg px-3 py-2 text-xs font-medium ${checked ? "bg-signal text-white" : "bg-card-ws text-text-ws-2"}`}>
      {label}
    </button>
  );
}
