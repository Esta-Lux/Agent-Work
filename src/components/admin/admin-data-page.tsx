"use client";

import { useEffect, useMemo, useState } from "react";
import { BlockerRow } from "@/components/ui/blocker-row";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusPill } from "@/components/ui/status-pill";

interface TableHealth {
  name: string;
  exists: boolean;
  rowCount: number | null;
  error?: string | null;
}

interface SupabaseOverview {
  health?: {
    configured: boolean;
    connected: boolean;
    schemaReady: boolean;
    projectRef: string | null;
    dashboardUrl?: string | null;
    tables?: TableHealth[];
    message: string;
    setupHint?: string | null;
  };
  telemetry?: {
    recent?: Array<{ id: string; finalOutcome: string; createdAt: string }>;
  };
  projects?: {
    count: number;
    storage: "supabase" | "local" | "hybrid";
  };
}

export function AdminDataPage() {
  const [overview, setOverview] = useState<SupabaseOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/supabase/overview")
      .then((res) => res.json().then((data: SupabaseOverview & { error?: string }) => ({ res, data })))
      .then(({ res, data }) => {
        if (!res.ok) throw new Error(data.error ?? "Supabase overview failed.");
        if (!cancelled) setOverview(data);
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Supabase overview failed.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const health = overview?.health;
  const tables = health?.tables ?? [];
  const missingTables = useMemo(() => tables.filter((table) => !table.exists), [tables]);

  return (
    <div className="space-y-6">
      <SectionHeader
        theme="admin"
        eyebrow="DATA"
        title="Supabase data management"
        description="Live setup state for BootRise data storage, schema health, project storage, and admin telemetry."
      />
      {error ? <BlockerRow severity="warning" title="Data status unavailable" description={error} /> : null}

      <section className="grid gap-4 xl:grid-cols-4">
        <StatusCard label="Configured" value={health?.configured ? "Yes" : "No"} ok={Boolean(health?.configured)} />
        <StatusCard label="Connected" value={health?.connected ? "Yes" : "No"} ok={Boolean(health?.connected)} />
        <StatusCard label="Schema ready" value={health?.schemaReady ? "Ready" : "Needs setup"} ok={Boolean(health?.schemaReady)} />
        <StatusCard label="Project ref" value={health?.projectRef ?? "Not set"} ok={Boolean(health?.projectRef)} />
      </section>

      {health && !health.schemaReady ? (
        <BlockerRow
          severity="warning"
          title="Schema setup needed"
          description={health.setupHint ?? health.message ?? "Run the Supabase migration helper before relying on cloud-backed admin data."}
        />
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-lg border border-border-admin bg-panel-admin p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-text-admin-1">Tables</h2>
            <StatusPill variant={missingTables.length === 0 && tables.length > 0 ? "signal" : "amber"} label={`${tables.length - missingTables.length}/${tables.length} present`} />
          </div>
          <div className="mt-3 divide-y divide-border-admin">
            {tables.length === 0 ? (
              <p className="py-6 text-sm text-text-admin-3">No table health rows reported yet.</p>
            ) : (
              tables.map((table) => (
                <div key={table.name} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-text-admin-1">{table.name}</p>
                    {table.error ? <p className="mt-1 text-xs text-red-500">{table.error}</p> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-text-admin-3">{table.rowCount === null ? "-" : table.rowCount.toLocaleString()} rows</span>
                    <StatusPill variant={table.exists ? "signal" : "amber"} label={table.exists ? "present" : "missing"} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <InfoCard title="Projects" value={`${overview?.projects?.count ?? 0}`} detail={`Storage: ${overview?.projects?.storage ?? "unknown"}`} />
          <InfoCard title="Recent telemetry" value={`${overview?.telemetry?.recent?.length ?? 0}`} detail="Loaded from the admin telemetry endpoint." />
          <InfoCard title="Migration helper" value="Available" detail="Use the existing Supabase migration SQL helper when schema readiness is blocked." />
        </div>
      </section>
    </div>
  );
}

function StatusCard({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <article className="rounded-lg border border-border-admin bg-panel-admin p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text-admin-1">{label}</p>
        <StatusPill variant={ok ? "signal" : "amber"} label={ok ? "ok" : "setup"} />
      </div>
      <p className="mt-3 truncate text-sm text-text-admin-2">{value}</p>
    </article>
  );
}

function InfoCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <article className="rounded-lg border border-border-admin bg-panel-admin p-4">
      <p className="text-sm font-semibold text-text-admin-1">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-text-admin-1">{value}</p>
      <p className="mt-2 text-sm leading-6 text-text-admin-2">{detail}</p>
    </article>
  );
}
