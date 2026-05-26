"use client";

import type { WorkspaceStep } from "@/components/workspace-ui";

export function WorkspaceQuickNav({
  busy,
  fileCount,
  hasReport,
  onStep,
  onImport,
  onReviewIssues,
  onFix,
  onSandbox,
  onExport
}: {
  busy: boolean;
  fileCount: number;
  hasReport: boolean;
  onStep: (step: WorkspaceStep) => void;
  onImport: () => void;
  onReviewIssues: () => void;
  onFix: () => void;
  onSandbox: () => void;
  onExport: () => void;
}) {
  const btn =
    "w-full cursor-pointer rounded-lg border border-line bg-white px-3 py-2 text-left text-xs font-semibold text-ink transition hover:border-signal/40 hover:bg-cloud disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <nav className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-steel">Quick actions</p>
      <button type="button" disabled={busy} className={btn} onClick={onImport}>
        Import / refresh GitHub
      </button>
      <button type="button" disabled={busy || fileCount === 0} className={btn} onClick={() => onStep("plan")}>
        Browse {fileCount > 0 ? `${fileCount} files` : "files"}
      </button>
      <button type="button" disabled={busy || fileCount === 0} className={btn} onClick={onReviewIssues}>
        Review project issues
      </button>
      <button type="button" disabled={busy || fileCount === 0} className={btn} onClick={onFix}>
        {hasReport ? "Open fix report" : "Fix and report"}
      </button>
      <button type="button" disabled={busy || fileCount === 0} className={btn} onClick={onSandbox}>
        Run sandbox verify
      </button>
      <button type="button" disabled={busy || fileCount === 0} className={btn} onClick={onExport}>
        Export bundle
      </button>
    </nav>
  );
}
