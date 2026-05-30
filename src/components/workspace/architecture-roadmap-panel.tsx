"use client";

import type { ArchitectureRoadmap } from "@/lib/workspace/workspace-types";

export function ArchitectureRoadmapPanel({
  roadmap,
  loading,
  onCreateFixMission
}: {
  roadmap: ArchitectureRoadmap | null;
  loading?: boolean;
  onCreateFixMission?: (value: string) => void;
}) {
  if (loading && !roadmap) {
    return <div className="rounded-lg bg-card-ws p-4 text-xs text-text-ws-2">Building architecture roadmap…</div>;
  }

  if (!roadmap) return null;

  return (
    <div className="space-y-3 rounded-lg bg-card-ws p-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-text-ws-3">Architecture roadmap</p>
        <p className="mt-1 text-sm font-semibold text-text-ws-1">{roadmap.appTypeTemplate?.displayName ?? roadmap.appType}</p>
        <p className="mt-1 text-xs leading-5 text-text-ws-2">{roadmap.currentStateSummary}</p>
      </div>
      {roadmap.detectedAppType ? <RoadmapMetric label="Detected app type" value={roadmap.detectedAppType.replace(/_/g, " ")} /> : null}
      <RoadmapMetric label="Maturity" value={roadmap.currentMaturity.replace(/_/g, " ")} />
      <RoadmapMetric label="Production readiness" value={roadmap.productionReadiness.replace(/_/g, " ")} />
      <RoadmapList title="Missing now" items={roadmap.missingCapabilities} />
      <RoadmapList title="Security policies" items={roadmap.securityPolicies} />
      {roadmap.policyGaps?.length ? (
        <div>
          <p className="text-xs font-semibold text-text-ws-1">Policy gaps</p>
          <div className="mt-1 space-y-2">
            {roadmap.policyGaps.slice(0, 3).map((gap) => (
              <div key={gap.policy} className="rounded-lg bg-black/20 p-2">
                <p className="text-xs font-semibold text-text-ws-1">{gap.policy}</p>
                <p className="mt-1 truncate font-mono text-[11px] text-text-ws-2" title={gap.affectedFiles.join(", ")}>
                  {gap.affectedFiles.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <RoadmapList title="Deployment blockers" items={roadmap.deploymentBlockers} />
      <RoadmapList title="Suggested phases" items={roadmap.suggestedPhases} />
      {roadmap.roadmapToBuildMissions?.length ? (
        <div>
          <p className="text-xs font-semibold text-text-ws-1">Suggested build missions</p>
          <div className="mt-1 space-y-2">
            {roadmap.roadmapToBuildMissions.slice(0, 2).map((mission) => (
              <button
                key={mission.title}
                type="button"
                className="block w-full rounded-lg bg-black/20 p-2 text-left hover:bg-signal-glow"
                onClick={() => onCreateFixMission?.(`${mission.title}: ${mission.description} Target files: ${mission.targetFiles.join(", ")}`)}
              >
                <span className="block text-xs font-semibold text-text-ws-1">{mission.title}</span>
                <span className="mt-1 block text-[11px] leading-4 text-text-ws-2">{mission.description}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <RoadmapList title="Acceptance criteria" items={roadmap.acceptanceCriteria} />
      <RoadmapList title="Legal/compliance warnings" items={roadmap.appTypeTemplate?.legalWarnings ?? []} />
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
