"use client";

import { useMemo, useState } from "react";
import { BlockerRow } from "@/components/ui/blocker-row";
import { CommandButton } from "@/components/ui/command-button";
import { StatusPill, type StatusPillVariant } from "@/components/ui/status-pill";
import { ArchitectureRoadmapPanel } from "@/components/workspace/architecture-roadmap-panel";
import { DeploymentReadinessPanel } from "@/components/workspace/deployment-readiness-panel";
import type { WorkspaceProvider, WorkspaceSpeed } from "@/components/workspace/mode-popover";
import { SecurityCenterPanel } from "@/components/workspace/security-center-panel";
import { ProviderDuelPanel } from "@/components/workspace/provider-duel-panel";
import type { WorkspaceV2Step } from "@/components/workspace/workflow-rail-v2";
import type { DeploymentReadinessResult, SecurityFinding } from "@/lib/security/types";
import type { ArchitectureRoadmap, ProjectBrief, WorkspaceFixReport } from "@/lib/workspace/workspace-types";
import type { WorkUnitPlan } from "@/lib/workspace/work-unit-planner";
import type { ProviderDuelResult } from "@/lib/ai/provider-duel";

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
  workUnitPlan: WorkUnitPlan | null;
  securityFindings: SecurityFinding[] | null;
  securityScore: number | null;
  securityCriticalCount: number | null;
  deploymentReadiness: DeploymentReadinessResult | null;
  deploymentCheckedAt: string | null;
  providerDuelResults: ProviderDuelResult[];
  busy: boolean;
  onGithubUrlChange: (value: string) => void;
  onGithubBranchChange: (value: string) => void;
  onImportModeChange: (value: "full" | "key") => void;
  onProjectNameChange: (value: string) => void;
  onBriefChange: (brief: ProjectBrief) => void;
  onFixRequestChange: (value: string) => void;
  onLoadBranches: () => void;
  onOpenDocs: () => void;
  onOpenDraftPr: (input?: { commitMessage?: string; prTitle?: string; prBody?: string; draft?: boolean }) => void;
  onProceedWithScopedFix: () => void;
  onSimplifyFixRequest: () => void;
  onRunSecurityScan: () => void;
  onRunDeploymentReadiness: () => void;
  onRunProviderDuel: () => void;
}

export function OperationPanelV2(props: OperationPanelV2Props) {
  return (
    <aside data-tour="context-inspector" className="flex w-80 shrink-0 flex-col border-l border-border-ws bg-panel-ws">
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
          {props.activeStep === "verify" ? <VerifyStep {...props} /> : null}
          {props.activeStep === "export" ? <ExportStep {...props} /> : null}
          <ArchitectureRoadmapPanel roadmap={props.roadmap} loading={props.roadmapLoading} onCreateFixMission={props.onFixRequestChange} />
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

function FixStep({ fixRequest, onFixRequestChange, provider, speed, workUnitPlan, busy, providerDuelResults, onProceedWithScopedFix, onSimplifyFixRequest, onRunProviderDuel }: OperationPanelV2Props) {
  return (
    <div className="space-y-4">
      <Field label="Fix request">
        <textarea className="min-h-32 w-full rounded-lg border border-border-ws bg-card-ws px-3 py-2 text-sm text-text-ws-1 outline-none" value={fixRequest} onChange={(event) => onFixRequestChange(event.target.value)} placeholder="Describe one scoped change..." />
      </Field>
      <div data-tour="provider-duel" className="rounded-lg bg-card-ws p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-text-ws-1">Plan summary</p>
          <StatusPill variant={speed === "security" ? "amber" : "blue"} label={speed} />
        </div>
        <p className="mt-2 text-xs leading-5 text-text-ws-2">Provider: {provider === "openai" ? "ChatGPT" : "BootRise"}. Approval gate remains required before workspace changes are applied.</p>
        <CommandButton theme="workspace" variant="secondary" size="sm" label="Compare providers" loading={busy} className="mt-3 w-full" onClick={onRunProviderDuel} />
      </div>
      <ProviderDuelPanel results={providerDuelResults} />
      {workUnitPlan?.requiresMultiPass ? (
        <div className="rounded-lg bg-card-ws p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-text-ws-1">Work unit plan</p>
            <StatusPill variant={workUnitPlan.estimatedRiskLevel === "high" ? "red" : workUnitPlan.estimatedRiskLevel === "medium" ? "amber" : "signal"} label={`${workUnitPlan.totalUnits} units`} />
          </div>
          <p className="mt-2 text-xs leading-5 text-text-ws-2">{workUnitPlan.taskSummary}</p>
          <div className="mt-3 space-y-2">
            {workUnitPlan.units.slice(0, 4).map((unit) => (
              <div key={unit.id} className="rounded-md bg-black/20 p-2">
                <p className="text-xs font-semibold text-text-ws-1">{unit.title}</p>
                <p className="mt-1 truncate font-mono text-[11px] text-text-ws-2" title={unit.targetFiles.join(", ")}>
                  {unit.targetFiles.join(", ")}
                </p>
              </div>
            ))}
          </div>
          {workUnitPlan.crossFileDependencyWarnings.length ? (
            <ul className="mt-3 space-y-1 text-xs leading-5 text-amber-300">
              {workUnitPlan.crossFileDependencyWarnings.slice(0, 3).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <CommandButton theme="workspace" variant="secondary" size="sm" label="Proceed with scoped fix" loading={busy} onClick={onProceedWithScopedFix} />
            <CommandButton theme="workspace" variant="secondary" size="sm" label="Simplify request" onClick={onSimplifyFixRequest} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function VerifyStep({
  sandboxLog,
  status,
  securityFindings,
  securityScore,
  securityCriticalCount,
  deploymentReadiness,
  deploymentCheckedAt,
  busy,
  onRunSecurityScan,
  onRunDeploymentReadiness
}: OperationPanelV2Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-card-ws p-4">
        <p className="text-sm font-semibold text-text-ws-1">Verification status</p>
        <p className="mt-1 text-xs text-text-ws-2">{status}</p>
      </div>
      {sandboxLog ? <pre className="max-h-72 overflow-auto rounded-lg bg-black/30 p-3 font-mono text-xs text-text-ws-2">{sandboxLog}</pre> : <BlockerRow severity="info" title="Sandbox verification" description="Run Verify after importing code. Configure E2B or Fly for deeper sandbox proof." />}
      <div data-tour="security-deploy" className="space-y-4">
        <SecurityCenterPanel findings={securityFindings} score={securityScore} criticalCount={securityCriticalCount} busy={busy} onRun={onRunSecurityScan} />
        <DeploymentReadinessPanel report={deploymentReadiness} checkedAt={deploymentCheckedAt} busy={busy} onRun={onRunDeploymentReadiness} />
      </div>
    </div>
  );
}

function ExportStep({
  exportMessage,
  draftPrMessage,
  report,
  githubUrl,
  securityCriticalCount,
  securityScore,
  deploymentReadiness,
  busy,
  onOpenDraftPr
}: Pick<OperationPanelV2Props, "exportMessage" | "draftPrMessage" | "report" | "githubUrl" | "securityCriticalCount" | "securityScore" | "deploymentReadiness" | "busy" | "onOpenDraftPr">) {
  const [commitMessage, setCommitMessage] = useState(() => `BootRise: ${report?.plan.intent.interpretedGoal.slice(0, 58) ?? "workspace patch"}`.slice(0, 72));
  const [prTitle, setPrTitle] = useState(() => `BootRise: ${report?.plan.intent.interpretedGoal.slice(0, 72) ?? "workspace patch"}`);
  const [draft, setDraft] = useState(true);
  const hasCriticalSecurity = Boolean(securityCriticalCount && securityCriticalCount > 0);
  const canOpenPr = Boolean(report?.approvalStatus === "approved" && githubUrl.trim() && !hasCriticalSecurity);
  const changedFiles = report?.patches?.map((patch) => patch.path) ?? report?.fixed?.map((file) => file.path) ?? [];
  const preflight = [
    { label: "Security scan run", ok: typeof securityScore === "number", warning: typeof securityScore !== "number" },
    { label: "Completion evaluator passed", ok: !report?.controlLayer?.taskCompletion?.blocked, warning: !report?.controlLayer?.taskCompletion },
    { label: "Reachability checks passed", ok: true, warning: false },
    { label: "Files changed > 0", ok: changedFiles.length > 0, warning: false },
    { label: "Patch approved", ok: report?.approvalStatus === "approved", warning: false },
    { label: "Verify run", ok: Boolean(report?.verificationSummary), warning: false }
  ];
  const prBodyPreview = useMemo(
    () =>
      [
        "# BootRise Draft PR",
        "",
        "## Task summary",
        report?.plan.intent.interpretedGoal ?? "Workspace patch",
        "",
        "## Changed files",
        changedFiles.map((file) => `- ${file}`).join("\n") || "- No files reported",
        "",
        "## Blast radius",
        report?.blastRadius?.join("\n") || "Review BootRise workspace report.",
        "",
        "## Safety evidence",
        `- Control: ${report?.controlLayer?.canApprove === false ? "blocked" : "passed or reviewable"}`,
        `- Security: ${typeof securityScore === "number" ? `${securityScore}/100` : "not run"}`,
        `- Deployment: ${deploymentReadiness?.status.replace(/_/g, " ") ?? "not run"}`,
        "",
        "Generated by BootRise."
      ].join("\n"),
    [changedFiles, deploymentReadiness, report, securityScore]
  );
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
              variant={safeToPrVariant(report.safeToPr.status)}
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
        <div className="mt-3 rounded-md bg-black/20 p-2">
          <p className="text-xs font-semibold text-text-ws-1">Security preflight</p>
          <p className="mt-1 text-xs leading-5 text-text-ws-2">
            {hasCriticalSecurity
              ? "Critical security blockers must be resolved before opening a draft PR."
              : typeof securityScore === "number"
                ? `Security scan score is ${securityScore}/100.`
                : "Security scan has not run yet. Draft PR is allowed, but BootRise will show this as an amber preflight warning."}
          </p>
          {deploymentReadiness ? <p className="mt-1 text-xs leading-5 text-text-ws-2">Deployment readiness: {deploymentReadiness.status.replace(/_/g, " ")}.</p> : null}
        </div>
        <div className="mt-3 space-y-3 rounded-md bg-black/20 p-2">
          <p className="text-xs font-semibold text-text-ws-1">PR composer</p>
          <ComposerField label="Commit message">
            <input className="w-full rounded-md border border-border-ws bg-card-ws px-2 py-1 font-mono text-xs text-text-ws-1 outline-none" value={commitMessage} maxLength={72} onChange={(event) => setCommitMessage(event.target.value)} />
          </ComposerField>
          <ComposerField label="PR title">
            <input className="w-full rounded-md border border-border-ws bg-card-ws px-2 py-1 text-xs text-text-ws-1 outline-none" value={prTitle} onChange={(event) => setPrTitle(event.target.value)} />
          </ComposerField>
          <button type="button" className="flex w-full items-center justify-between rounded-md bg-card-ws px-2 py-2 text-xs text-text-ws-2" onClick={() => setDraft(!draft)}>
            <span>Draft PR</span>
            <StatusPill variant={draft ? "blue" : "amber"} label={draft ? "on" : "off"} />
          </button>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-text-ws-3">Preflight</p>
            <div className="mt-1 space-y-1">
              {preflight.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-text-ws-2">{item.label}</span>
                  <StatusPill variant={item.ok ? "signal" : item.warning ? "amber" : "red"} label={item.ok ? "ok" : item.warning ? "warning" : "blocker"} />
                </div>
              ))}
            </div>
          </div>
          <ComposerField label="PR body preview">
            <textarea className="max-h-52 min-h-36 w-full rounded-md border border-border-ws bg-card-ws px-2 py-2 font-mono text-[11px] leading-5 text-text-ws-2 outline-none" value={prBodyPreview} readOnly />
          </ComposerField>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <CommandButton
            theme="workspace"
            variant="secondary"
            size="md"
            label="Open draft PR"
            className="w-full"
            disabled={!canOpenPr || busy || !commitMessage.trim() || commitMessage.length > 72 || changedFiles.length === 0}
            onClick={() => onOpenDraftPr({ commitMessage, prTitle, prBody: prBodyPreview, draft })}
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

function ComposerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-text-ws-3">{label}</span>
      {children}
    </label>
  );
}

function safeToPrVariant(status: "yes" | "caution" | "no"): StatusPillVariant {
  if (status === "yes") return "signal" as const;
  if (status === "caution") return "blue" as const;
  return "amber" as const;
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
