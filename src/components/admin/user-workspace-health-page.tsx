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

interface UserWorkspaceHealthResponse {
  report?: {
    healthy: boolean;
    score: number;
    checks: WorkspaceHealthCheck[];
  };
  error?: string;
}

export function UserWorkspaceHealthPage() {
  const [data, setData] = useState<UserWorkspaceHealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
