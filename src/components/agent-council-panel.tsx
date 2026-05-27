import type { AgentCoordinationSummary, ControlLayerSummary } from "@/lib/control/types";
import { StatusPill } from "@/components/ui/status-pill";

const AGENT_LABELS: Record<string, string> = {
  lead_architect: "Lead Architect",
  graph_planner: "Graph Planner (Brain v2)",
  reviewer: "Repo Reviewer",
  builder: "Builder Agent",
  security: "Security Agent",
  qa: "QA Agent",
  runtime_monitor: "Runtime Monitor",
  deployment: "Deployment Agent"
};

export function AgentCouncilPanel({
  control,
  liveCoordination
}: {
  control?: ControlLayerSummary;
  liveCoordination?: AgentCoordinationSummary;
}) {
  const coordination = control?.agentCoordination ?? liveCoordination;
  if (!coordination) {
    return <p className="text-sm text-steel">Import code, run Security scan or chat review, or run Fix to see agent council.</p>;
  }

  const decisions = coordination.decisions;
  const blockers = decisions.filter((d) => d.blocksPatch);
  const warnings = decisions.filter((d) => d.severity === "warning" && !d.blocksPatch);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-line bg-gradient-to-br from-cloud/80 to-white p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-signal">Agent Council</p>
        <p className="mt-1 text-sm font-semibold text-ink">{coordination.leadSummary}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <MiniStat label="Patch" value={coordination.canApply ? "Can apply" : coordination.canPatch ? "Needs proof" : "Held"} />
          <MiniStat label="Blockers" value={String(blockers.length)} />
          <MiniStat label="Warnings" value={String(warnings.length)} />
        </div>
      </div>
      {!control && liveCoordination ? (
        <p className="text-xs text-steel">Live preview from Security Center and review findings — run Fix for patch-level gates.</p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        {decisions.map((d) => (
          <div key={d.agent} className={`rounded-xl border p-3 ${d.blocksPatch ? "border-critical/30 bg-critical/5" : d.severity === "warning" ? "border-amber-200 bg-amber-50/60" : "border-line bg-white"}`}>
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
