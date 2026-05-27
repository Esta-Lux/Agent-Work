"use client";

import { WorkspaceIntelligenceMenu, isIntelligenceTab, type IntelligenceTabId } from "@/components/workspace-intelligence-menu";
import type { WorkspaceStep } from "@/components/workspace-ui";

const STEP_LABELS: Record<WorkspaceStep, string> = {
  connect: "Connect repository",
  plan: "Files & product brief",
  fix: "Fix & approval",
  verify: "Verify & preview",
  export: "PR & export"
};

export function WorkspacePanelChrome({
  activeStep,
  contextTab,
  onOverview,
  onIntelligence,
  securityBlockers
}: {
  activeStep: WorkspaceStep;
  contextTab: string;
  onOverview: () => void;
  onIntelligence: (tab: IntelligenceTabId) => void;
  securityBlockers?: number;
}) {
  const intelligenceTitles: Record<IntelligenceTabId, string> = {
    architecture: "Architecture map",
    brain: "Project brain",
    control: "Control layer",
    security: "Security & deployment",
    ledger: "Living ledger"
  };
  const title =
    contextTab === "overview"
      ? "Overview"
      : isIntelligenceTab(contextTab)
        ? intelligenceTitles[contextTab]
        : STEP_LABELS[activeStep];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-gradient-to-r from-ink via-ink to-graphite px-4 py-3 text-white">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">Context Inspector</p>
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onOverview}
          className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-semibold transition ${
            contextTab === "overview"
              ? "border-white/30 bg-white/15 text-white"
              : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
          }`}
        >
          Overview
        </button>
        <WorkspaceIntelligenceMenu activeTab={contextTab} onSelect={onIntelligence} blockers={securityBlockers} />
      </div>
    </div>
  );
}
