"use client";

import { StatusPill } from "@/components/ui/status-pill";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";

export function SelfAgentDiffPanel({
  patches,
  blockers,
  warnings,
  verifyStatus,
  draftPrStatus
}: {
  patches: ProposedPatch[];
  blockers: string[];
  warnings: string[];
  verifyStatus?: string;
  draftPrStatus?: string;
}) {
  return (
    <section className="rounded-lg border border-border-admin bg-panel-admin p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-text-admin-1">Patch preview</p>
        <StatusPill variant={blockers.length > 0 ? "red" : patches.length > 0 ? "signal" : "amber"} label={blockers.length > 0 ? "blocked" : patches.length > 0 ? "ready" : "empty"} />
      </div>
      {patches.length === 0 ? <p className="mt-2 text-xs text-text-admin-3">No patch preview available yet.</p> : null}
      <div className="mt-3 space-y-2">
        {patches.slice(0, 8).map((patch) => (
          <article key={patch.path} className="rounded-md bg-surface-admin p-2">
            <p className="font-mono text-[11px] text-text-admin-1">{patch.path}</p>
            <p className="mt-1 text-xs text-text-admin-2">{patch.summary}</p>
          </article>
        ))}
      </div>
      {blockers.length > 0 ? <ul className="mt-3 space-y-1 text-xs text-red-500">{blockers.map((item) => <li key={item}>• {item}</li>)}</ul> : null}
      {warnings.length > 0 ? <ul className="mt-3 space-y-1 text-xs text-amber-500">{warnings.map((item) => <li key={item}>• {item}</li>)}</ul> : null}
      <div className="mt-3 grid gap-2 text-xs text-text-admin-2 md:grid-cols-2">
        <div className="rounded-md bg-surface-admin p-2">Verify: {verifyStatus ?? "not run"}</div>
        <div className="rounded-md bg-surface-admin p-2">Draft PR: {draftPrStatus ?? "not created"}</div>
      </div>
    </section>
  );
}
