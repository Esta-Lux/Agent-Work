"use client";

import type { ProjectBrainV2 } from "@/lib/project-brain/project-brain-v2";

export function ProjectBrainPanelV2({ brain }: { brain: ProjectBrainV2 | null }) {
  if (!brain) return null;

  return (
    <section className="rounded-lg bg-card-ws p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-text-ws-3">Project Brain v2</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <Metric label="Files indexed" value={String(brain.indexedFiles)} />
        <Metric label="Symbols" value={String(brain.symbolIndex.reduce((sum, file) => sum + file.exports.length, 0))} />
        <Metric label="API routes" value={String(brain.summary.totalApiRoutes)} />
        <Metric label="Unguarded routes" value={String(brain.summary.unguardedRoutes.length)} />
        <Metric label="Env vars" value={String(brain.summary.envVarsReferenced.length)} />
        <Metric label="Missing env docs" value={String(brain.summary.missingEnvDocs.length)} />
      </div>
      {brain.testMap.tests.length > 0 ? <p className="mt-2 text-xs text-text-ws-2">Related tests: {brain.testMap.tests.slice(0, 4).join(", ")}</p> : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border-ws px-2 py-1">
      <p className="font-mono text-[10px] uppercase tracking-widest text-text-ws-3">{label}</p>
      <p className="mt-1 text-xs font-semibold text-text-ws-1">{value}</p>
    </div>
  );
}
