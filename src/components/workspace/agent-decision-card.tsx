"use client";

import { StatusPill } from "@/components/ui/status-pill";

export interface WorkspaceAgentDecision {
  id: string;
  name: string;
  status: "idle" | "running" | "passed" | "blocked";
  summary: string;
  blockedReason?: string;
}

export function AgentDecisionCard({ decision }: { decision: WorkspaceAgentDecision }) {
  return (
    <article className={`rounded-lg border p-3 ${decision.status === "blocked" ? "border-red-500/30 bg-red-500/5" : "border-border-ws bg-card-ws"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-text-ws-1">{decision.name}</p>
        <StatusPill variant={decision.status === "blocked" ? "red" : decision.status === "passed" ? "signal" : decision.status === "running" ? "amber" : "blue"} label={decision.status} />
      </div>
      <p className="mt-1 text-xs leading-5 text-text-ws-2">{decision.summary}</p>
      {decision.blockedReason ? <p className="mt-1 text-xs text-red-300">{decision.blockedReason}</p> : null}
    </article>
  );
}
