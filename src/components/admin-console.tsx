"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AdminKillSwitches } from "@/components/admin-kill-switches";
import { AdminControlHub } from "@/components/admin-control-hub";
import { AdminAIChatbox } from "@/components/admin-ai-chatbox";
import { AdminAgentConsole } from "@/components/admin-agent-console";
import { AdminDetectionsPanel } from "@/components/admin-detections-panel";
import { AdminBuildModePanel } from "@/components/admin-build-mode-panel";
import { AdminWorkspaceStatePanel } from "@/components/admin-workspace-state-panel";
import { PlatformStatusBar } from "@/components/platform-status-bar";
import { StatusPill } from "@/components/status-pill";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MetricTile } from "@/components/ui/metric-tile";
import { PanelShell } from "@/components/ui/panel-shell";

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

interface TableHealth {
  name: string;
  exists: boolean;
  rowCount: number | null;
  error: string | null;
}

interface SupabaseHealth {
  configured: boolean;
  connected: boolean;
  schemaReady: boolean;
  projectRef: string | null;
  dashboardUrl: string | null;
  publishableKeySet: boolean;
  tables: TableHealth[];
  message: string;
  setupHint: string | null;
}

interface TelemetryRecord {
  id: string;
  projectId: string;
  finalOutcome: string;
  planningDurationMs: number;
  tokenComputeCost: number;
  createdAt: string;
}

interface OverviewResponse {
  health: SupabaseHealth;
  projects: {
    count: number;
    storage: "supabase" | "local" | "hybrid";
    recent: Array<{ id: string; name: string; fileCount: number; provider: string; updatedAt: string }>;
  };
  telemetry: {
    summary: {
      activeSessions: number;
      firstPassSuccessRate: number;
      averageTimeToPlanMs: number;
      averageComputeCost: number;
      totalCommittedDiffs: number;
    };
    recent: TelemetryRecord[];
  };
}

export function AdminConsole() {
  const [readiness, setReadiness] = useState<ReadinessReport | null>(null);
  const [providers, setProviders] = useState<ProviderHealth[]>([]);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [economics, setEconomics] = useState<{
    taskCosts?: { blendedTaskCost?: number };
    scenarioResults?: Array<{ label: string; users: number; grossMargin: number }>;
  } | null>(null);
  const [migrationSql, setMigrationSql] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [status, setStatus] = useState("Loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setStatus("Loading");
    setLoadError(null);
    try {
      const [readinessRes, providersRes, overviewRes, economicsRes, sqlRes] = await Promise.all([
        fetch("/api/admin/readiness"),
        fetch("/api/ai/providers/health"),
        fetch("/api/admin/supabase/overview"),
        fetch("/api/admin/unit-economics"),
        fetch("/api/admin/supabase/migration-sql")
      ]);

      if (!readinessRes.ok) throw new Error("Readiness API failed.");

      const readinessJson = (await readinessRes.json()) as { report?: ReadinessReport };
      if (!readinessJson.report?.items) throw new Error("Readiness response missing report.items.");
      setReadiness(readinessJson.report);

      const providersJson = (await providersRes.json()) as { providers?: ProviderHealth[] };
      setProviders(providersJson.providers ?? []);

      setOverview((await overviewRes.json()) as OverviewResponse);
      const economicsJson = (await economicsRes.json()) as { economics?: typeof economics };
      setEconomics(economicsJson.economics ?? null);

      const sqlJson = (await sqlRes.json()) as { sql?: string };
      setMigrationSql(sqlJson.sql ?? null);

      setStatus("Ready");
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : "Failed to load admin overview.");
      setStatus("Degraded");
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  async function copyMigrationSql() {
    if (!migrationSql) return;
    await navigator.clipboard.writeText(migrationSql);
    setCopyStatus("SQL copied — paste into Supabase SQL Editor and Run.");
    setTimeout(() => setCopyStatus(null), 4000);
  }

  const items = readiness?.items ?? [];
  const health = overview?.health;
  const telemetry = overview?.telemetry;

  const phase3Complete = [
    "WebContainer in-browser preview (COOP/COEP)",
    "Device farm streams API + Supabase remote_streams",
    "Multi-tenant orgs + RLS (migration 003)",
    "Cloud Living Ledger + pending fixes + audit",
    "Architecture map, personas, kill switches, BootRise voice"
  ];

  return (
    <section className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
      <div className="mb-6 overflow-hidden rounded-[1.75rem] border border-line bg-[radial-gradient(circle_at_top_left,rgba(60,214,160,0.18),transparent_34%),linear-gradient(135deg,#ffffff,#f7fbfa)] shadow-sm">
        <div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-signal">Operator control</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">BootRise Command Ops</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-graphite">
              One control room for readiness, kill switches, AI routing, Supabase, economics, audit, and deep QA.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white/80 p-3">
            <StatusPill label={status} />
            <StatusPill label={readiness?.productionReady ? "Production ready" : "Launch blocked"} tone={readiness?.productionReady ? "passed" : "warning"} />
          </div>
        </div>
        <div className="grid gap-2 border-t border-line bg-white/70 px-6 py-4 md:grid-cols-2 xl:grid-cols-5">
          {phase3Complete.map((item) => (
            <div key={item} className="rounded-xl border border-line bg-cloud/50 px-3 py-2 text-xs font-medium text-graphite">
              ✓ {item}
            </div>
          ))}
        </div>
      </div>

      {loadError ? (
        <Alert className="mb-4" tone="danger" title="Admin overview could not fully load" action={{ label: "Retry", onClick: loadOverview }}>
          {loadError}
        </Alert>
      ) : null}

      <div className="mb-6 grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
        <PlatformStatusBar variant="admin" storage={overview?.projects.storage} />
        <PanelShell
          title="Operator map"
          eyebrow="Information architecture"
          description="Overview → Control → Readiness → Data → Telemetry → Audit. The page is grouped like an ops console instead of one long settings scroll."
        >
          <div className="grid gap-2 text-xs sm:grid-cols-3">
            {["Control", "Readiness", "Supabase", "Telemetry", "Economics", "Audit"].map((label) => (
              <a key={label} href={`#${label.toLowerCase()}`} className="rounded-lg border border-line bg-cloud/50 px-3 py-2 font-semibold text-ink hover:bg-white">
                {label}
              </a>
            ))}
          </div>
        </PanelShell>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard label="Production ready" value={readiness?.productionReady ? "Yes" : "No"} />
        <StatCard label="Readiness" value={readiness ? `${readiness.score}%` : "—"} />
        <StatCard label="Supabase schema" value={health?.schemaReady ? "Ready" : health?.configured ? "Setup" : "Off"} />
        <StatCard label="Projects" value={String(overview?.projects.count ?? 0)} />
        <StatCard label="Telemetry rows" value={String(telemetry?.recent.length ?? 0)} />
        <StatCard
          label="Blended task $"
          value={economics?.taskCosts?.blendedTaskCost != null ? `$${economics.taskCosts.blendedTaskCost.toFixed(2)}` : "—"}
        />
      </div>

      <div id="control" className="mb-6 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <PanelShell
          title="Kill switches"
          eyebrow="Control"
          description="Immediate operator levers for models, GitHub, sandbox, premium escalation, and workspace size."
        >
          <AdminKillSwitches />
        </PanelShell>
        <PanelShell
          title="Control hub — user workspace safety"
          eyebrow="Live governance"
          description="Scope locks, patch blocks, token estimates, and approval outcomes from the AI coding control layer."
        >
          <AdminControlHub />
        </PanelShell>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[0.75fr_1fr_0.85fr]">
        <Panel id="readiness" title="AI providers">
          <ul className="space-y-2">
            {providers.map((p) => (
              <li key={p.provider} className="rounded border border-line bg-cloud p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{p.provider === "bootrise" ? "BootRise" : "ChatGPT"}</span>
                  <StatusPill label={p.connected ? "On" : "Off"} tone={p.connected ? "neutral" : "failed"} />
                </div>
                <p className="mt-1 text-steel">{p.model}</p>
                <p className="mt-1 text-graphite">{p.message}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel id="supabase" title="Supabase">
          {health ? (
            <div className="space-y-2 text-xs text-graphite">
              <p>{health.message}</p>
              <p>
                Project: <span className="font-semibold text-ink">{health.projectRef ?? "—"}</span>
              </p>
              <p>Publishable key: {health.publishableKeySet ? "Set" : "Missing"}</p>
              <ul className="space-y-1">
                {health.tables.map((table) => (
                  <li key={table.name} className="flex justify-between rounded border border-line bg-cloud px-2 py-1">
                    <span>{table.name}</span>
                    <span className="text-steel">
                      {table.exists ? `${table.rowCount ?? 0} rows` : "missing"}
                    </span>
                  </li>
                ))}
              </ul>
              {health.dashboardUrl ? (
                <a className="font-semibold text-signal underline" href={health.dashboardUrl} target="_blank" rel="noreferrer">
                  Open Supabase dashboard
                </a>
              ) : null}
              {!health.schemaReady ? (
                <Button
                  type="button"
                  className="mt-2"
                  fullWidth
                  size="sm"
                  onClick={copyMigrationSql}
                >
                  Copy setup SQL
                </Button>
              ) : null}
              {copyStatus ? <p className="text-signal">{copyStatus}</p> : null}
            </div>
          ) : null}
        </Panel>

        <Panel id="telemetry" title="Telemetry & economics">
          {telemetry ? (
            <ul className="space-y-1 text-xs text-graphite">
              <li>Active sessions: {telemetry.summary.activeSessions}</li>
              <li>First-pass success: {telemetry.summary.firstPassSuccessRate}%</li>
              <li>Avg plan time: {telemetry.summary.averageTimeToPlanMs} ms</li>
              <li>Avg compute: ${telemetry.summary.averageComputeCost.toFixed(3)}</li>
              <li>Committed fixes: {telemetry.summary.totalCommittedDiffs}</li>
              {economics?.scenarioResults?.[0] ? (
                <li>
                  {economics.scenarioResults[0].label}: {economics.scenarioResults[0].users} users, margin{" "}
                  {(economics.scenarioResults[0].grossMargin * 100).toFixed(0)}%
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="text-xs text-steel">Run a fix on the user workspace to populate telemetry.</p>
          )}
        </Panel>
      </div>

      <div id="audit" className="mb-6 grid gap-4 xl:grid-cols-2">
        {overview?.projects.recent && overview.projects.recent.length > 0 ? (
          <PanelShell title={`Recent projects (${overview.projects.storage})`} eyebrow="Workspaces">
            <DataTable
              headers={["Name", "Files", "Provider", "Updated"]}
              rows={overview.projects.recent.map((p) => [
                <span className="font-semibold text-ink" key="name">{p.name}</span>,
                p.fileCount,
                p.provider,
                new Date(p.updatedAt).toLocaleString()
              ])}
            />
          </PanelShell>
        ) : null}

        {telemetry && telemetry.recent.length > 0 ? (
          <PanelShell title="Recent sessions" eyebrow="Audit trail">
            <DataTable
              headers={["Project", "Outcome", "Plan ms", "Cost", "When"]}
              rows={telemetry.recent.map((row) => [
                row.projectId,
                <StatusPill key="outcome" label={row.finalOutcome} tone={row.finalOutcome === "COMMITTED" ? "neutral" : "failed"} />,
                row.planningDurationMs,
                `$${row.tokenComputeCost.toFixed(3)}`,
                new Date(row.createdAt).toLocaleString()
              ])}
            />
          </PanelShell>
        ) : null}
      </div>

      {items.length > 0 ? (
        <PanelShell id="readiness" className="mb-6" title="Launch blockers" eyebrow="Readiness">
          <ul className="mt-3 space-y-2">
            {items.map((item) => (
              <li key={item.area} className="rounded border border-line bg-cloud p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{item.area}</span>
                  <StatusPill label={item.status} />
                </div>
                <p className="mt-1 text-graphite">{item.summary}</p>
                <p className="mt-1 text-xs text-steel">Next: {item.nextStep}</p>
              </li>
            ))}
          </ul>
        </PanelShell>
      ) : null}

      <PanelShell
        id="workspace-state"
        title="Workspace state"
        eyebrow="User-section mirror"
        description="Live read of user-section data: projects, pending fixes, runtime errors, sandbox runs, usage drilldown, jobs."
        className="mb-6"
      >
        <AdminWorkspaceStatePanel />
      </PanelShell>

      <PanelShell
        id="detections"
        title="Detections"
        eyebrow="Self-aware safety net"
        description="Static + live signals from this repo. Manual scanner + 60s watchdog. Click Fix it to hand off to the admin self-agent."
        className="mb-6"
      >
        <AdminDetectionsPanel />
      </PanelShell>

      <PanelShell
        title="Self-Agent"
        eyebrow="Codebase self-improvement"
        description="Chat with, plan against, and patch the BootRise codebase itself. Approved fixes can open a draft PR or, with explicit confirmation, push directly to main."
        className="mb-6"
      >
        <AdminAgentConsole />
      </PanelShell>

      <div className="mb-6">
        <AdminBuildModePanel userId="admin-console" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <PanelShell title="Admin operator copilot" eyebrow="AI ops">
          <AdminAIChatbox />
        </PanelShell>

        <PanelShell title="API quick checks" eyebrow="Diagnostics" className="text-sm text-graphite">
          <ul className="mt-3 list-inside list-disc space-y-2 text-xs leading-5">
            <li>
              <a className="text-signal underline" href="/api/admin/supabase/overview" target="_blank" rel="noreferrer">
                /api/admin/supabase/overview
              </a>
            </li>
            <li>
              <a className="text-signal underline" href="/api/admin/readiness" target="_blank" rel="noreferrer">
                /api/admin/readiness
              </a>
            </li>
            <li>
              <a className="text-signal underline" href="/api/admin/unit-economics" target="_blank" rel="noreferrer">
                /api/admin/unit-economics
              </a>
            </li>
            <li>
              <a className="text-signal underline" href="/api/ai/providers/health" target="_blank" rel="noreferrer">
                /api/ai/providers/health
              </a>
            </li>
            <li>
              <a className="text-signal underline" href="/">
                User workspace
              </a>
            </li>
          </ul>
          <Button
            type="button"
            className="mt-4"
            variant="secondary"
            onClick={loadOverview}
          >
            Refresh all
          </Button>
        </PanelShell>
      </div>
    </section>
  );
}

function Panel({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <PanelShell id={id} title={title}>
      {children}
    </PanelShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return <MetricTile label={label} value={value} size="hero" />;
}

function DataTable({ headers, rows }: { headers: string[]; rows: Array<Array<ReactNode>> }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-line text-steel">
            {headers.map((header) => (
              <th key={header} className="py-2 pr-4 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-line/60 text-graphite">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="py-2 pr-4 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
