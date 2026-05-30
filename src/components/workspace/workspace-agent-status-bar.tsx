"use client";

import type { WorkspaceAgentDecision } from "@/components/workspace/agent-decision-card";

export function WorkspaceAgentStatusBar({ decisions }: { decisions: WorkspaceAgentDecision[] }) {
  const active = decisions.find((decision) => decision.status === "running") ?? decisions.find((decision) => decision.status === "blocked") ?? decisions[0];
  const blocked = decisions.filter((decision) => decision.status === "blocked").length;

  return (
    <div className="rounded-lg border border-border-ws bg-card-ws px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-widest text-text-ws-3">Agent status</p>
      <p className="mt-1 text-xs text-text-ws-2">
        Active: <span className="font-semibold text-text-ws-1">{active?.name ?? "None"}</span>
        {blocked > 0 ? ` · ${blocked} blocker${blocked === 1 ? "" : "s"}` : ""}
      </p>
    </div>
  );
}
