"use client";

import { useEffect, useMemo, useState } from "react";
import { BlockerRow } from "@/components/ui/blocker-row";
import { MissionCard } from "@/components/ui/mission-card";
import { ProviderCard } from "@/components/ui/provider-card";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusPill } from "@/components/ui/status-pill";

interface ReadinessItem {
  area: string;
  status: string;
  summary: string;
  nextStep: string;
}

interface ReadinessReport {
  productionReady: boolean;
  score: number;
  items: ReadinessItem[];
}

interface ProviderHealth {
  provider: "bootrise" | "openai";
  connected: boolean;
  model: string;
  message: string;
}

interface SupabaseOverview {
  health?: {
    configured: boolean;
    connected: boolean;
    schemaReady: boolean;
    projectRef: string | null;
    tables?: Array<{ name: string; exists: boolean; rowCount: number | null }>;
    message: string;
  };
  telemetry?: {
    recent?: Array<{ id: string; finalOutcome: string; createdAt: string; tokenComputeCost: number }>;
  };
}

interface ControlSnapshot {
  recentEvents: Array<{ action: string; detail: string; severity?: string; createdAt: string }>;
}

interface AdminBuildMission {
  id: string;
  title?: string;
  goal?: string;
  status?: string;
  branchName?: string;
  createdAt?: string;
  summary?: string;
}

export function AdminOverview() {
  const [readiness, setReadiness] = useState<ReadinessReport | null>(null);
  const [providers, setProviders] = useState<ProviderHealth[]>([]);
  const [supabase, setSupabase] = useState<SupabaseOverview | null>(null);
  const [control, setControl] = useState<ControlSnapshot | null>(null);
  const [missions, setMissions] = useState<AdminBuildMission[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(null);
      try {
        const [readinessRes, providersRes, supabaseRes, controlRes, missionsRes] = await Promise.all([
          fetch("/api/admin/readiness"),
          fetch("/api/ai/providers/health"),
          fetch("/api/admin/supabase/overview"),
          fetch("/api/admin/control-hub"),
          fetch("/api/admin/build-missions")
        ]);
        const readinessJson = (await readinessRes.json()) as { report?: ReadinessReport; error?: string };
        const providersJson = (await providersRes.json()) as { providers?: ProviderHealth[] };
        const supabaseJson = (await supabaseRes.json()) as SupabaseOverview;
        const controlJson = (await controlRes.json()) as { snapshot?: ControlSnapshot };
        const missionsJson = (await missionsRes.json()) as { missions?: AdminBuildMission[] };
        if (cancelled) return;
        if (!readinessJson.report) throw new Error(readinessJson.error ?? "Readiness unavailable.");
        setReadiness(readinessJson.report);
        setProviders(providersJson.providers ?? []);
        setSupabase(supabaseJson);
        setControl(controlJson.snapshot ?? null);
        setMissions(missionsJson.missions ?? []);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Admin overview failed to load.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const blockers = useMemo(
    () => readiness?.items.filter((item) => item.status !== "ready").slice(0, 5) ?? [],
    [readiness]
  );
  const bootrise = providers.find((provider) => provider.provider === "bootrise");
  const openai = providers.find((provider) => provider.provider === "openai");
  const score = readiness?.score ?? 0;
  const readinessLabel = readiness?.productionReady ? "Ready" : score >= 70 ? "Approaching beta-ready" : "Not production-ready";

  return (
    <div className="space-y-6">
      <SectionHeader
        theme="admin"
        eyebrow="OPS OVERVIEW"
        title="Launch readiness"
        description="A calm control surface for the systems that decide whether BootRise is safe to sell, support, and operate."
      />

      {error ? <BlockerRow severity="warning" title="Admin overview degraded" description={error} /> : null}

      <section className="rounded-lg border border-border-admin bg-panel-admin p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={`text-5xl font-semibold ${score >= 70 ? "text-signal" : "text-amber-500"}`}>{score}%</p>
            <p className="mt-2 text-sm font-medium text-text-admin-1">{readinessLabel}</p>
          </div>
          <StatusPill variant={readiness?.productionReady ? "signal" : "amber"} label={readiness?.productionReady ? "Production ready" : "Launch blocked"} />
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full rounded-full bg-signal" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
        </div>
        <div className="mt-5 space-y-2">
          {blockers.length === 0 ? (
            <BlockerRow severity="info" title="No critical launch blockers reported" description="Readiness checks are not reporting a blocking item." />
          ) : (
            blockers.map((item) => (
              <BlockerRow key={item.area} severity="critical" title={item.area} description={`${item.summary} Next: ${item.nextStep}`} />
            ))
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <ProviderCard
          name="AI Provider"
          status={bootrise?.connected || openai?.connected ? "connected" : "missing"}
          description={bootrise?.message ?? openai?.message ?? "No AI provider has reported healthy configuration yet."}
          envVar={bootrise?.connected ? bootrise.model : "NVIDIA_API_KEY"}
        />
        <ProviderCard
          name="Supabase / Data"
          status={supabase?.health?.schemaReady ? "connected" : supabase?.health?.configured ? "degraded" : "missing"}
          description={supabase?.health?.message ?? "Supabase health has not reported yet."}
          envVar={`${supabase?.health?.tables?.filter((table) => table.exists).length ?? 0} migrations/tables ready`}
        />
        <ProviderCard
          name="GitHub App"
          status="missing"
          description="GitHub import works with the current workspace flow; app install status is surfaced in the self-agent section."
          envVar="GITHUB_APP_CLIENT_ID"
          docsUrl="/docs/GITHUB_APP.md"
        />
        <ProviderCard
          name="Credits / Usage"
          status="connected"
          description={`Recent telemetry: ${supabase?.telemetry?.recent?.length ?? 0} operation records loaded.`}
          envVar="workspace credits"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-border-admin bg-panel-admin p-4">
          <h2 className="text-sm font-semibold text-text-admin-1">Recent control events</h2>
          <div className="mt-3 space-y-2">
            {(control?.recentEvents ?? []).slice(0, 5).map((event) => (
              <div key={`${event.createdAt}-${event.action}`} className="flex items-center justify-between gap-3 rounded-md bg-surface-admin px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-admin-1">{event.action}</p>
                  <p className="font-mono text-[10px] text-text-admin-3">{new Date(event.createdAt).toLocaleString()}</p>
                </div>
                <StatusPill variant={event.severity === "block" ? "red" : "neutral"} label={event.severity ?? "info"} />
              </div>
            ))}
            {(control?.recentEvents ?? []).length === 0 ? <p className="text-sm text-text-admin-3">No control events yet.</p> : null}
          </div>
        </div>
        <div className="rounded-lg border border-border-admin bg-panel-admin p-4">
          <h2 className="text-sm font-semibold text-text-admin-1">Recent self-agent missions</h2>
          <div className="mt-3 space-y-2">
            {missions.slice(0, 5).map((mission) => (
              <MissionCard
                key={mission.id}
                id={mission.id}
                title={mission.title ?? mission.goal ?? "Self-agent mission"}
                status={mission.status === "running" ? "running" : mission.status === "failed" ? "failed" : mission.status === "complete" ? "complete" : "pending"}
                branch={mission.branchName}
                createdAt={mission.createdAt ?? new Date().toISOString()}
                summary={mission.summary}
              />
            ))}
            {missions.length === 0 ? <p className="text-sm text-text-admin-3">No self-agent missions yet.</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}

