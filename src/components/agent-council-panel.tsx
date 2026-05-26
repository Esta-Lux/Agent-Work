import type { ControlLayerSummary } from "@/lib/control/types";
import { StatusPill } from "@/components/ui/status-pill";

const AGENT_LABELS: Record<string, string> = {
  lead_architect: "Lead Architect",
  builder: "Builder Agent",
  security: "Security Agent",
  qa: "QA Agent",
  runtime_monitor: "Runtime Monitor",
  deployment: "Deployment Agent"
};

export function AgentCouncilPanel({ control }: { control?: ControlLayerSummary }) {
  if (!control) {
    return <p className="text-sm text-steel">Run a fix to see the agent council coordination summary.</p>;
  }

  const decisions = control.agentCoordination.decisions;

  return (
    <div className="space-y-3">
      <p className="text-sm text-graphite">{control.agentCoordination.leadSummary}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {decisions.map((d) => (
          <div key={d.agent} className="rounded-lg border border-line bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">{AGENT_LABELS[d.agent] ?? d.agent}</p>
              <StatusPill
                label={d.blocksPatch ? "Blocks patch" : "Clear"}
                tone={d.blocksPatch ? "danger" : d.severity === "warning" ? "warning" : "success"}
              />
            </div>
            <p className="mt-2 text-xs text-steel">{d.finding}</p>
            {d.recommendedFix ? (
              <p className="mt-1 text-xs text-graphite">
                <span className="font-medium">Next: </span>
                {d.recommendedFix}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
