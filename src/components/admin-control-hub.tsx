"use client";

import { useEffect, useState } from "react";
import { StatusPill } from "@/components/status-pill";
import type { ControlTelemetrySnapshot } from "@/lib/control/types";

export function AdminControlHub() {
  const [snapshot, setSnapshot] = useState<ControlTelemetrySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/control-hub")
      .then((res) => res.json())
      .then((data: { snapshot?: ControlTelemetrySnapshot; error?: string }) => {
        if (data.error) throw new Error(data.error);
        setSnapshot(data.snapshot ?? null);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Load failed"));
  }, []);

  if (error) {
    return <p className="text-sm text-critical">{error}</p>;
  }

  if (!snapshot) {
    return <p className="text-sm text-steel">Loading control hub…</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-graphite">
        Tracks how the user workspace control layer scopes tasks, blocks bad patches, and estimates token use.
        Use kill switches above to pause fix or expensive models platform-wide.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Blocks (24h)" value={String(snapshot.blocksLast24h)} />
        <Stat label="Patch blocks" value={String(snapshot.patchBlocksLast24h)} />
        <Stat label="Approvals" value={String(snapshot.approvalsLast24h)} />
        <Stat label="Rejections" value={String(snapshot.rejectionsLast24h)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded border border-line bg-cloud p-3 text-xs">
          <p className="font-semibold text-ink">Avg deep-read files / task</p>
          <p className="mt-1 text-2xl font-semibold text-signal">{snapshot.avgFilesDeepRead}</p>
        </div>
        <div className="rounded border border-line bg-cloud p-3 text-xs">
          <p className="font-semibold text-ink">Avg context tokens</p>
          <p className="mt-1 text-2xl font-semibold text-signal">
            {snapshot.avgTokenEstimate > 0 ? `~${(snapshot.avgTokenEstimate / 1000).toFixed(1)}k` : "—"}
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-steel">Recent control events</p>
        <ul className="max-h-48 space-y-2 overflow-y-auto">
          {snapshot.recentEvents.length === 0 ? (
            <li className="text-xs text-steel">No events yet — run Fix on the user workspace.</li>
          ) : (
            snapshot.recentEvents.map((event) => (
              <li key={`${event.createdAt}-${event.action}`} className="rounded border border-line bg-white px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{event.action}</span>
                  <StatusPill
                    label={event.severity ?? "info"}
                    tone={event.severity === "block" ? "failed" : "neutral"}
                  />
                </div>
                <p className="mt-1 text-graphite">{event.detail}</p>
                <p className="mt-1 text-[10px] text-steel">{new Date(event.createdAt).toLocaleString()}</p>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-line bg-white p-3">
      <p className="text-xs text-steel">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}
