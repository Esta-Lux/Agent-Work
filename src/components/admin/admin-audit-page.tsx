"use client";

import { useEffect, useState } from "react";
import type { AdminBuildMission } from "@/lib/admin-build/types";
import { BlockerRow } from "@/components/ui/blocker-row";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusPill } from "@/components/ui/status-pill";

interface AuditEntry {
  id?: string;
  actor?: string;
  action: string;
  detail: string;
  createdAt?: string;
  timestamp?: string;
}

interface ControlSnapshot {
  recentEvents: Array<{ action: string; detail: string; severity?: string; createdAt: string }>;
}

export function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [missions, setMissions] = useState<AdminBuildMission[]>([]);
  const [control, setControl] = useState<ControlSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [auditRes, missionsRes, controlRes] = await Promise.all([
          fetch("/api/admin/audit?limit=50"),
          fetch("/api/admin/build-missions?limit=10"),
          fetch("/api/admin/control-hub")
        ]);
        const auditJson = (await auditRes.json()) as { entries?: AuditEntry[]; error?: string };
        const missionsJson = (await missionsRes.json()) as { missions?: AdminBuildMission[]; error?: string };
        const controlJson = (await controlRes.json()) as { snapshot?: ControlSnapshot; error?: string };
        if (!auditRes.ok) throw new Error(auditJson.error ?? "Audit feed failed.");
        if (!cancelled) {
          setEntries(auditJson.entries ?? []);
          setMissions(missionsJson.missions ?? []);
          setControl(controlJson.snapshot ?? null);
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Audit activity failed to load.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const missionEvents = missions.flatMap((mission) =>
    (mission.events ?? []).map((event) => ({
      id: event.id,
      title: event.message,
      detail: `${mission.title} - ${event.type}`,
      at: event.timestamp
    }))
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        theme="admin"
        eyebrow="AUDIT"
        title="Operational audit"
        description="Recent admin actions, self-agent mission events, and control-layer activity from existing operational stores."
      />
      {error ? <BlockerRow severity="warning" title="Audit feed not fully wired" description={error} /> : null}

      <section className="grid gap-4 xl:grid-cols-3">
        <ActivityPanel title="Audit entries" empty="No audit entries recorded yet.">
          {entries.slice(0, 10).map((entry, index) => (
            <ActivityRow key={entry.id ?? `${entry.action}-${index}`} title={entry.action} detail={entry.detail} at={entry.createdAt ?? entry.timestamp} />
          ))}
        </ActivityPanel>
        <ActivityPanel title="Mission events" empty="No mission events recorded yet.">
          {missionEvents.slice(0, 10).map((event) => (
            <ActivityRow key={event.id} title={event.title} detail={event.detail} at={event.at} />
          ))}
        </ActivityPanel>
        <ActivityPanel title="Control events" empty="No control events recorded yet.">
          {(control?.recentEvents ?? []).slice(0, 10).map((event) => (
            <ActivityRow key={`${event.createdAt}-${event.action}`} title={event.action} detail={event.detail} at={event.createdAt} severity={event.severity} />
          ))}
        </ActivityPanel>
      </section>

      <section className="rounded-lg border border-border-admin bg-panel-admin p-4">
        <h2 className="text-sm font-semibold text-text-admin-1">What appears here next</h2>
        <p className="mt-2 text-sm leading-6 text-text-admin-2">
          This page will become the single feed for approvals, mission state changes, provider incidents, kill-switch changes, and security events. Today it shows the real stores already wired in BootRise.
        </p>
      </section>
    </div>
  );
}

function ActivityPanel({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <article className="rounded-lg border border-border-admin bg-panel-admin p-4">
      <h2 className="text-sm font-semibold text-text-admin-1">{title}</h2>
      <div className="mt-3 space-y-2">{hasChildren ? children : <p className="text-sm text-text-admin-3">{empty}</p>}</div>
    </article>
  );
}

function ActivityRow({ title, detail, at, severity }: { title: string; detail: string; at?: string; severity?: string }) {
  return (
    <div className="rounded-md bg-surface-admin px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium text-text-admin-1">{title}</p>
        {severity ? <StatusPill variant={severity === "block" ? "red" : "neutral"} label={severity} /> : null}
      </div>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-admin-2">{detail}</p>
      {at ? <p className="mt-1 font-mono text-[10px] text-text-admin-3">{new Date(at).toLocaleString()}</p> : null}
    </div>
  );
}
