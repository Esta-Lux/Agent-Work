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
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-gradient-to-r from-white to-cloud/40 px-4 py-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-signal">Workspace panel</p>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onOverview}
          className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-semibold transition ${
            contextTab === "overview"
              ? "border-signal/40 bg-signal/10 text-signal"
              : "border-line bg-white text-graphite hover:bg-cloud"
          }`}
        >
          Overview
        </button>
        <WorkspaceIntelligenceMenu activeTab={contextTab} onSelect={onIntelligence} blockers={securityBlockers} />
      </div>
    </div>
  );
}
