"use client";

import type { ArchitectureRoadmap } from "@/lib/workspace/workspace-types";

export function ArchitectureRoadmapPanel({
  roadmap,
  loading
}: {
  roadmap: ArchitectureRoadmap | null;
  loading?: boolean;
}) {
  if (loading && !roadmap) {
    return <div className="rounded-lg bg-card-ws p-4 text-xs text-text-ws-2">Building architecture roadmap…</div>;
  }

  if (!roadmap) return null;

  return (
    <div className="space-y-3 rounded-lg bg-card-ws p-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-text-ws-3">Architecture roadmap</p>
        <p className="mt-1 text-sm font-semibold text-text-ws-1">{roadmap.appType}</p>
        <p className="mt-1 text-xs leading-5 text-text-ws-2">{roadmap.currentStateSummary}</p>
      </div>
      <RoadmapMetric label="Maturity" value={roadmap.currentMaturity.replace(/_/g, " ")} />
      <RoadmapMetric label="Production readiness" value={roadmap.productionReadiness.replace(/_/g, " ")} />
      <RoadmapList title="Missing now" items={roadmap.missingCapabilities} />
      <RoadmapList title="Security policies" items={roadmap.securityPolicies} />
      <RoadmapList title="Deployment blockers" items={roadmap.deploymentBlockers} />
      <RoadmapList title="Suggested phases" items={roadmap.suggestedPhases} />
      <RoadmapList title="Acceptance criteria" items={roadmap.acceptanceCriteria} />
    </div>
  );
}

function RoadmapMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-ws/80 px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-widest text-text-ws-3">{label}</p>
      <p className="mt-1 text-xs font-semibold text-text-ws-1">{value}</p>
    </div>
  );
}

function RoadmapList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-text-ws-1">{title}</p>
      <ul className="mt-1 space-y-1 text-xs leading-5 text-text-ws-2">
        {items.slice(0, 4).map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}
