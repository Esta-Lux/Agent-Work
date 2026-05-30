"use client";

import { useMemo, useState } from "react";
import { CommandButton } from "@/components/ui/command-button";
import { StatusPill } from "@/components/ui/status-pill";
import type { DeploymentReadinessResult } from "@/lib/security/types";
import { buildPrPreflight } from "@/lib/workspace/pr-preflight";
import type { WorkspaceFixReport } from "@/lib/workspace/workspace-types";

export function PrComposerPanel({
  report,
  githubUrl,
  securityCriticalCount,
  securityScore,
  deploymentReadiness,
  busy,
  draftPrMessage,
  onOpenDraftPr
}: {
  report: WorkspaceFixReport | null;
  githubUrl: string;
  securityCriticalCount: number | null;
  securityScore: number | null;
  deploymentReadiness: DeploymentReadinessResult | null;
  busy: boolean;
  draftPrMessage: string | null;
  onOpenDraftPr: (input?: { commitMessage?: string; prTitle?: string; prBody?: string; draft?: boolean }) => void;
}) {
  const [commitMessage, setCommitMessage] = useState(() => `BootRise: ${report?.plan.intent.interpretedGoal.slice(0, 58) ?? "workspace patch"}`.slice(0, 72));
  const [prTitle, setPrTitle] = useState(() => `BootRise: ${report?.plan.intent.interpretedGoal.slice(0, 72) ?? "workspace patch"}`);
  const [draft, setDraft] = useState(true);
  const changedFiles = useMemo(
    () => report?.patches?.map((patch) => patch.path) ?? report?.fixed?.map((file) => file.path) ?? [],
    [report]
  );
  const preflight = buildPrPreflight({ report, changedFiles, securityScore, securityCriticalCount, deploymentReadiness });
  const blocked = preflight.some((item) => !item.ok && !item.warning);
  const canOpenPr = Boolean(report?.approvalStatus === "approved" && githubUrl.trim() && !blocked);

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
        "## Safety preflight",
        ...preflight.map((item) => `- ${item.label}: ${item.ok ? "passed" : item.warning ? "warning" : "blocked"}`)
      ].join("\n"),
    [changedFiles, preflight, report]
  );

  return (
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
      <CommandButton
        theme="workspace"
        variant="secondary"
        size="md"
        label="Open draft PR"
        className="w-full"
        disabled={!canOpenPr || busy || !commitMessage.trim() || commitMessage.length > 72 || changedFiles.length === 0}
        onClick={() => onOpenDraftPr({ commitMessage, prTitle, prBody: prBodyPreview, draft })}
      />
      <p className="text-xs leading-5 text-text-ws-2">{draftPrMessage ?? (canOpenPr ? "BootRise will push the approved patch and open a draft PR." : "Resolve preflight blockers before opening a draft PR.")}</p>
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
