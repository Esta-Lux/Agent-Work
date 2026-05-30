"use client";

import { StatusPill } from "@/components/ui/status-pill";
import type { ArchitectConversationResult } from "@/lib/agents/user/architect-conversation-agent";
import { CommandButton } from "@/components/ui/command-button";

export function ArchitectConversationPanel({
  result,
  assumptionsApproved,
  onApproveAssumptions
}: {
  result: ArchitectConversationResult | null;
  assumptionsApproved?: boolean;
  onApproveAssumptions?: () => void;
}) {
  if (!result) return null;
  return (
    <section className="rounded-lg bg-card-ws p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-text-ws-3">Architect conversation</p>
        <StatusPill
          variant={result.classification === "clear_to_build" ? "signal" : result.classification === "high_risk" ? "red" : "amber"}
          label={result.classification.replace(/_/g, " ")}
        />
      </div>
      <p className="mt-2 text-xs text-text-ws-1">{result.message}</p>
      {result.question ? <p className="mt-2 text-xs text-amber-300">Question: {result.question}</p> : null}
      {result.recommendation ? <p className="mt-2 text-xs text-text-ws-2">Recommended: {result.recommendation}</p> : null}
      {onApproveAssumptions && result.classification !== "clear_to_build" ? (
        <CommandButton
          theme="workspace"
          variant="ghost"
          size="sm"
          className="mt-3"
          label={assumptionsApproved ? "Assumptions approved" : "Approve assumptions"}
          disabled={assumptionsApproved}
          onClick={onApproveAssumptions}
        />
      ) : null}
    </section>
  );
}
