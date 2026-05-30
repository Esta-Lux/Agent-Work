"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusPill } from "@/components/ui/status-pill";
import { BlockerRow } from "@/components/ui/blocker-row";

interface WorkspaceHealthCheck {
  id: string;
  label: string;
  status: "healthy" | "warning";
  detail: string;
}

interface SyntheticWorkspaceProbe {
  route: string;
  method: "GET" | "POST";
  status: number | null;
  responseTimeMs: number;
  result: "pass" | "fail" | "skip";
  error?: string;
}

interface UserWorkspaceHealthResponse {
  report?: {
    healthy: boolean;
    score: number;
    checks: WorkspaceHealthCheck[];
    syntheticChecks?: SyntheticWorkspaceProbe[];
  };
  error?: string;
}

export function UserWorkspaceHealthPage() {
  const [data, setData] = useState<UserWorkspaceHealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syntheticBusy, setSyntheticBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/user-workspace-health")
      .then((res) => res.json().then((body: UserWorkspaceHealthResponse) => ({ res, body })))
      .then(({ res, body }) => {
        if (!res.ok) throw new Error(body.error ?? "User workspace health failed.");
        if (!cancelled) setData(body);
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "User workspace health failed.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const report = data?.report;

  async function runSyntheticChecks() {
    setSyntheticBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/user-workspace-health?synthetic=true");
      const body = (await res.json()) as UserWorkspaceHealthResponse;
      if (!res.ok) throw new Error(body.error ?? "Live health checks failed.");
      setData(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Live health checks failed.");
    } finally {
      setSyntheticBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        theme="admin"
        eyebrow="USER WORKSPACE"
        title="User Workspace health"
        description="Operational checks for workspace import, fix, verify, security, and PR readiness surfaces."
      />

      {error ? <BlockerRow severity="warning" title="Health unavailable" description={error} /> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Overall health"
          value={report ? `${report.score}%` : "--"}
          status={report?.healthy ? "healthy" : "warning"}
        />
        <MetricCard
          label="Healthy checks"
          value={report ? `${report.checks.filter((check) => check.status === "healthy").length}/${report.checks.length}` : "--"}
          status={report?.healthy ? "healthy" : "warning"}
        />
      </section>

      <section className="rounded-lg border border-border-admin bg-panel-admin p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-text-admin-1">Live route probes</h2>
            <p className="mt-1 text-xs text-text-admin-3">Synthetic checks run only when requested and reuse the current admin session.</p>
          </div>
          <button
            type="button"
            className="h-9 rounded-lg border border-border-admin px-3 text-sm font-medium text-text-admin-2 hover:bg-surface-admin disabled:opacity-60"
            disabled={syntheticBusy}
            onClick={runSyntheticChecks}
          >
            {syntheticBusy ? "Running..." : "Run live health checks"}
          </button>
        </div>
        {report?.syntheticChecks?.length ? (
          <div className="mt-4 overflow-hidden rounded-lg border border-border-admin">
            <div className="grid grid-cols-[1fr_80px_80px_120px_90px] bg-surface-admin px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-text-admin-3">
              <span>Route</span>
              <span>Method</span>
              <span>Status</span>
              <span>Response</span>
              <span>Result</span>
            </div>
            {report.syntheticChecks.map((probe) => (
              <div key={`${probe.method}:${probe.route}`} className="grid grid-cols-[1fr_80px_80px_120px_90px] items-center gap-2 border-t border-border-admin px-3 py-2 text-xs">
                <span className="truncate font-mono text-text-admin-2" title={probe.error ? `${probe.route} - ${probe.error}` : probe.route}>{probe.route}</span>
                <span className="font-mono text-text-admin-3">{probe.method}</span>
                <span className="font-mono text-text-admin-2">{probe.status ?? "--"}</span>
                <span className="font-mono text-text-admin-2">{probe.responseTimeMs}ms</span>
                <StatusPill variant={probe.result === "pass" ? "signal" : probe.result === "skip" ? "amber" : "red"} label={probe.result} />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-text-admin-3">No live route probes have run in this session.</p>
        )}
      </section>

      <section className="rounded-lg border border-border-admin bg-panel-admin p-4">
        <h2 className="text-sm font-semibold text-text-admin-1">Surface checks</h2>
        <div className="mt-3 divide-y divide-border-admin">
          {(report?.checks ?? []).map((check) => (
            <div key={check.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-admin-1">{check.label}</p>
                <p className="mt-1 truncate text-xs text-text-admin-3">{check.detail}</p>
              </div>
              <StatusPill variant={check.status === "healthy" ? "signal" : "amber"} label={check.status} />
            </div>
          ))}
          {!report ? <p className="py-3 text-sm text-text-admin-3">Loading checks…</p> : null}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  status
}: {
  label: string;
  value: string;
  status: "healthy" | "warning";
}) {
  return (
    <article className="rounded-lg border border-border-admin bg-panel-admin p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-text-admin-1">{label}</p>
        <StatusPill variant={status === "healthy" ? "signal" : "amber"} label={status} />
      </div>
      <p className="mt-2 text-2xl font-semibold text-text-admin-1">{value}</p>
    </article>
  );
}
