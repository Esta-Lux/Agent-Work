"use client";

import { AgentDecisionCard, type WorkspaceAgentDecision } from "@/components/workspace/agent-decision-card";
import { WorkspaceAgentStatusBar } from "@/components/workspace/workspace-agent-status-bar";

export function WorkspaceAgentCouncilPanel({ decisions }: { decisions: WorkspaceAgentDecision[] }) {
  if (decisions.length === 0) return null;

  return (
    <section className="space-y-3 rounded-lg bg-panel-ws/40 p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-text-ws-3">Agent council</p>
      <WorkspaceAgentStatusBar decisions={decisions} />
      <div className="grid gap-2">
        {decisions.map((decision) => (
          <AgentDecisionCard key={decision.id} decision={decision} />
        ))}
      </div>
    </section>
  );
}
