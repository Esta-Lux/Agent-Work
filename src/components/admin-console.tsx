"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AdminKillSwitches } from "@/components/admin-kill-switches";
import { PlatformStatusBar } from "@/components/platform-status-bar";
import { StatusPill } from "@/components/status-pill";

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
  const [message, setMessage] = useState("");
  const [adminProvider, setAdminProvider] = useState<"bootrise" | "openai">("bootrise");
  const [reply, setReply] = useState<string | null>(null);
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

  async function sendAdminMessage() {
    if (!message.trim()) return;
    setStatus("Thinking");
    try {
      const response = await fetch("/api/ai/admin-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), model: adminProvider })
      });
      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Admin chat failed.");
      setReply(data.reply ?? null);
      setStatus("Ready");
    } catch (caught) {
      setReply(caught instanceof Error ? caught.message : "Admin chat failed.");
      setStatus("Blocked");
    }
  }

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
    <section className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-6 rounded-xl border border-signal/25 bg-signal/5 p-4">
        <p className="text-xs font-semibold uppercase text-signal">Phase 3+ — Enterprise (shipped)</p>
        <p className="mt-1 text-sm text-graphite">
          Run Supabase migrations 001–003. WebContainer, device streams, and cloud ledger/audit are live at{" "}
          <code className="text-ink">/</code>.
        </p>
        <ul className="mt-3 grid gap-1 sm:grid-cols-2">
          {phase3Complete.map((item) => (
            <li key={item} className="text-xs text-graphite">
              ✓ {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-steel">Operator control</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">Platform overview</h2>
        </div>
        <StatusPill label={status} />
      </div>

      {loadError ? (
        <div className="mb-4 rounded border border-critical/25 bg-critical/10 p-3 text-sm text-critical">{loadError}</div>
      ) : null}

      <div className="mb-6">
        <PlatformStatusBar variant="admin" storage={overview?.projects.storage} />
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

      <div className="mb-6">
        <AdminKillSwitches />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Panel title="AI providers">
          <ul className="space-y-2">
            {providers.map((p) => (
              <li key={p.provider} className="rounded border border-line bg-cloud p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{p.provider === "bootrise" ? "BootRise / NVIDIA" : "OpenAI"}</span>
                  <StatusPill label={p.connected ? "On" : "Off"} tone={p.connected ? "neutral" : "failed"} />
                </div>
                <p className="mt-1 text-steel">{p.model}</p>
                <p className="mt-1 text-graphite">{p.message}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Supabase">
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
                <button
                  type="button"
                  className="mt-2 w-full rounded bg-signal px-3 py-2 text-xs font-semibold text-white"
                  onClick={copyMigrationSql}
                >
                  Copy setup SQL
                </button>
              ) : null}
              {copyStatus ? <p className="text-signal">{copyStatus}</p> : null}
            </div>
          ) : null}
        </Panel>

        <Panel title="Telemetry & economics">
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

      {overview?.projects.recent && overview.projects.recent.length > 0 ? (
        <div className="mb-6 rounded border border-line bg-white p-4">
          <p className="text-sm font-semibold text-ink">Recent projects ({overview.projects.storage})</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-steel">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Files</th>
                  <th className="py-2 pr-4">Provider</th>
                  <th className="py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {overview.projects.recent.map((p) => (
                  <tr key={p.id} className="border-b border-line/60 text-graphite">
                    <td className="py-2 pr-4 font-semibold text-ink">{p.name}</td>
                    <td className="py-2 pr-4">{p.fileCount}</td>
                    <td className="py-2 pr-4">{p.provider}</td>
                    <td className="py-2">{new Date(p.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {telemetry && telemetry.recent.length > 0 ? (
        <div className="mb-6 rounded border border-line bg-white p-4">
          <p className="text-sm font-semibold text-ink">Recent sessions</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-steel">
                  <th className="py-2 pr-4">Project</th>
                  <th className="py-2 pr-4">Outcome</th>
                  <th className="py-2 pr-4">Plan ms</th>
                  <th className="py-2 pr-4">Cost</th>
                  <th className="py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {telemetry.recent.map((row) => (
                  <tr key={row.id} className="border-b border-line/60 text-graphite">
                    <td className="py-2 pr-4">{row.projectId}</td>
                    <td className="py-2 pr-4">
                      <StatusPill label={row.finalOutcome} tone={row.finalOutcome === "COMMITTED" ? "neutral" : "failed"} />
                    </td>
                    <td className="py-2 pr-4">{row.planningDurationMs}</td>
                    <td className="py-2 pr-4">${row.tokenComputeCost.toFixed(3)}</td>
                    <td className="py-2">{new Date(row.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="mb-6 rounded border border-line bg-white p-4">
          <p className="text-sm font-semibold text-ink">Launch blockers</p>
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
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded border border-line bg-white p-4">
          <p className="text-sm font-semibold text-ink">Admin operator chat</p>
          <select
            className="mt-3 w-full rounded border border-line bg-cloud px-3 py-2 text-sm"
            value={adminProvider}
            onChange={(e) => setAdminProvider(e.target.value as "bootrise" | "openai")}
          >
            <option value="bootrise">BootRise / NVIDIA NIM</option>
            <option value="openai">OpenAI GPT-5.5</option>
          </select>
          <textarea
            className="mt-3 min-h-24 w-full rounded border border-line bg-cloud p-3 text-sm"
            placeholder="Ask about readiness, Supabase, cost, or platform changes..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button type="button" className="mt-2 rounded bg-ink px-4 py-2 text-sm font-semibold text-white" onClick={sendAdminMessage}>
            Send
          </button>
          {reply ? (
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-cloud p-3 text-xs leading-5 text-graphite">
              {reply}
            </pre>
          ) : null}
        </div>

        <div className="rounded border border-line bg-white p-4 text-sm text-graphite">
          <p className="font-semibold text-ink">API quick checks</p>
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
          <button
            type="button"
            className="mt-4 rounded border border-line px-4 py-2 text-sm font-semibold text-graphite"
            onClick={loadOverview}
          >
            Refresh all
          </button>
        </div>
      </div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded border border-line bg-white p-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-line bg-white p-4">
      <p className="text-xs font-semibold uppercase text-steel">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}
