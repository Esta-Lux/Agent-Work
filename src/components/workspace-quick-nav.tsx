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
  onExport,
  layout = "vertical"
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
  layout?: "vertical" | "compact";
}) {
  const btn =
    "cursor-pointer rounded-lg border border-line bg-white px-3 py-2 text-left text-xs font-semibold text-ink transition hover:border-signal/40 hover:bg-cloud disabled:cursor-not-allowed disabled:opacity-50";
  const navClass = layout === "compact" ? "grid grid-cols-2 gap-2 sm:grid-cols-3" : "space-y-2";
  const buttonClass = layout === "compact" ? btn : `${btn} w-full`;

  return (
    <nav className={navClass}>
      <p className={layout === "compact" ? "col-span-full text-[10px] font-semibold uppercase tracking-wide text-steel" : "text-[10px] font-semibold uppercase tracking-wide text-steel"}>Quick actions</p>
      <button type="button" disabled={busy} className={buttonClass} onClick={onImport}>
        Import / refresh GitHub
      </button>
      <button type="button" disabled={busy || fileCount === 0} className={buttonClass} onClick={() => onStep("plan")}>
        Browse {fileCount > 0 ? `${fileCount} files` : "files"}
      </button>
      <button type="button" disabled={busy || fileCount === 0} className={buttonClass} onClick={onReviewIssues}>
        Review project issues
      </button>
      <button type="button" disabled={busy || fileCount === 0} className={buttonClass} onClick={onFix}>
        {hasReport ? "Open fix report" : "Fix and report"}
      </button>
      <button type="button" disabled={busy || fileCount === 0} className={buttonClass} onClick={onSandbox}>
        Run sandbox verify
      </button>
      <button type="button" disabled={busy || fileCount === 0} className={buttonClass} onClick={onExport}>
        Export bundle
      </button>
    </nav>
  );
}
