"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusPill } from "@/components/status-pill";

type Tab = "projects" | "fixes" | "runtime" | "sandbox" | "usage" | "jobs";

interface ProjectRow {
  id: string;
  name: string;
  orgId: string;
  fileCount: number;
  preferredProvider: string;
  githubUrl?: string;
  updatedAt: string;
}
interface FixRow {
  id: string;
  repositoryId: string;
  status: string;
  request: string;
  filesChanged: number;
  riskLevel?: string;
  createdAt: string;
}
interface RuntimeCluster {
  projectId: string;
  totalCount: number;
  events: Array<{ id: string; message: string; count: number; lastSeen: string; likelyFiles: string[] }>;
}
interface SandboxRow {
  id: string;
  planId: string;
  repositoryId: string;
  status: string;
  modifiedFiles: string[];
  createdAt: string;
}
interface JobRow {
  id: string;
  type: string;
  status: string;
  projectId: string;
  orgId: string;
  error?: string;
  updatedAt: string;
}
interface UsageBucket { key?: string; userId?: string; model?: string; mode?: string; taskType?: string; status?: string; calls: number; credits?: number; cost?: number }
interface UsageBreakdown {
  totals?: { calls: number; credits: number; estimatedCostUsd: number };
  byUser: UsageBucket[]; byModel: UsageBucket[]; byMode: UsageBucket[]; byTaskType: UsageBucket[]; byStatus: UsageBucket[];
}

const TAB_LABELS: Record<Tab, string> = {
  projects: "Projects",
  fixes: "Workspace fixes",
  runtime: "Runtime errors",
  sandbox: "Sandbox runs",
  usage: "Usage drilldown",
  jobs: "Jobs queue"
};

export function AdminWorkspaceStatePanel() {
  const [tab, setTab] = useState<Tab>("projects");
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [fixes, setFixes] = useState<FixRow[]>([]);
  const [runtime, setRuntime] = useState<RuntimeCluster[]>([]);
  const [sandbox, setSandbox] = useState<SandboxRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [usage, setUsage] = useState<UsageBreakdown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (which: Tab) => {
    setError(null);
    setBusy(true);
    try {
      if (which === "projects") {
        const r = await fetch("/api/admin/workspace/projects?limit=200");
        const b = (await r.json()) as { projects?: ProjectRow[]; error?: string };
        if (!r.ok) throw new Error(b.error ?? "Failed");
        setProjects(b.projects ?? []);
      } else if (which === "fixes") {
        const r = await fetch("/api/admin/workspace/fixes?limit=200");
        const b = (await r.json()) as { fixes?: FixRow[]; error?: string };
        if (!r.ok) throw new Error(b.error ?? "Failed");
        setFixes(b.fixes ?? []);
      } else if (which === "runtime") {
        const r = await fetch("/api/admin/workspace/runtime-events");
        const b = (await r.json()) as { clusters?: RuntimeCluster[]; error?: string };
        if (!r.ok) throw new Error(b.error ?? "Failed");
        setRuntime(b.clusters ?? []);
      } else if (which === "sandbox") {
        const r = await fetch("/api/admin/workspace/sandbox-runs?limit=100");
        const b = (await r.json()) as { runs?: SandboxRow[]; error?: string };
        if (!r.ok) throw new Error(b.error ?? "Failed");
        setSandbox(b.runs ?? []);
      } else if (which === "jobs") {
        const r = await fetch("/api/admin/workspace/jobs?limit=200");
        const b = (await r.json()) as { jobs?: JobRow[]; error?: string };
        if (!r.ok) throw new Error(b.error ?? "Failed");
        setJobs(b.jobs ?? []);
      } else if (which === "usage") {
        const r = await fetch("/api/admin/workspace/usage?limit=2000");
        const b = (await r.json()) as UsageBreakdown & { error?: string };
        if (!r.ok) throw new Error(b.error ?? "Failed");
        setUsage(b);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void load(tab); }, [tab, load]);

  const counts = useMemo(() => ({
    projects: projects.length,
    fixes: fixes.length,
    runtime: runtime.reduce((acc, c) => acc + c.totalCount, 0),
    sandbox: sandbox.length,
    usage: usage?.totals?.calls ?? 0,
    jobs: jobs.length
  }), [projects, fixes, runtime, sandbox, usage, jobs]);

  return (
    <div className="rounded border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">Workspace state</p>
          <p className="text-xs text-graphite">Live read of the user-section: projects, fixes, runtime errors, sandbox, usage, jobs.</p>
        </div>
        <button type="button" className="cursor-pointer rounded border border-line px-3 py-1 text-xs" disabled={busy} onClick={() => void load(tab)}>
          {busy ? "Loading…" : "Refresh"}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {(Object.keys(TAB_LABELS) as Tab[]).map((k) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium ${tab === k ? "bg-ink text-white" : "bg-cloud text-graphite"}`}>
            {TAB_LABELS[k]} · {counts[k]}
          </button>
        ))}
      </div>
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
      <div className="mt-3">
        {tab === "projects" ? <ProjectsTable rows={projects} /> : null}
        {tab === "fixes" ? <FixesTable rows={fixes} /> : null}
        {tab === "runtime" ? <RuntimeList clusters={runtime} /> : null}
        {tab === "sandbox" ? <SandboxTable rows={sandbox} /> : null}
        {tab === "jobs" ? <JobsTable rows={jobs} /> : null}
        {tab === "usage" ? <UsageView data={usage} /> : null}
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-xs text-steel">No {label} yet.</p>;
}

function statusTone(s: string): "ok" | "warning" | "danger" | "neutral" {
  if (/(approved|pass|success|complete|succeeded|resolved|ok)/i.test(s)) return "ok";
  if (/(pend|queue|running|new|estimated|allowed)/i.test(s)) return "neutral";
  if (/(reject|fail|blocked|critical|runtime_fail|test_fail|compile_fail)/i.test(s)) return "danger";
  return "warning";
}
function Tag({ s }: { s: string }) {
  const tone = statusTone(s);
  const cls = tone === "ok" ? "bg-emerald-50 text-emerald-700" : tone === "danger" ? "bg-red-50 text-red-700" : tone === "neutral" ? "bg-slate-50 text-slate-700" : "bg-amber-50 text-amber-700";
  return <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-medium ${cls}`}>{s}</span>;
}

function ProjectsTable({ rows }: { rows: ProjectRow[] }) {
  if (!rows.length) return <Empty label="projects" />;
  return (
    <table className="w-full text-xs">
      <thead className="text-left text-steel">
        <tr><th className="py-1">Project</th><th>Org</th><th>Files</th><th>Provider</th><th>GitHub</th><th>Updated</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-line">
            <td className="py-1.5 font-medium text-ink">{r.name}</td>
            <td className="text-graphite">{r.orgId}</td>
            <td>{r.fileCount}</td>
            <td>{r.preferredProvider}</td>
            <td className="truncate max-w-[16ch]">{r.githubUrl ? <a className="underline" href={r.githubUrl} target="_blank" rel="noreferrer">link</a> : "—"}</td>
            <td className="text-steel">{new Date(r.updatedAt).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FixesTable({ rows }: { rows: FixRow[] }) {
  if (!rows.length) return <Empty label="pending fixes" />;
  return (
    <table className="w-full text-xs">
      <thead className="text-left text-steel"><tr><th className="py-1">Request</th><th>Status</th><th>Risk</th><th>Files</th><th>Created</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-line">
            <td className="py-1.5 max-w-[40ch] truncate text-ink">{r.request || "(no request)"}</td>
            <td><Tag s={r.status} /></td>
            <td>{r.riskLevel ?? "—"}</td>
            <td>{r.filesChanged}</td>
            <td className="text-steel">{new Date(r.createdAt).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RuntimeList({ clusters }: { clusters: RuntimeCluster[] }) {
  if (!clusters.length) return <Empty label="runtime errors" />;
  return (
    <div className="space-y-3">
      {clusters.map((c) => (
        <div key={c.projectId} className="rounded border border-line p-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-ink">{c.projectId}</span>
            <StatusPill label={`${c.totalCount} events`} tone="warning" />
          </div>
          <ul className="mt-1 space-y-1">
            {c.events.slice(0, 5).map((e) => (
              <li key={e.id} className="text-[11px] text-graphite">
                <span className="font-mono">{e.message.slice(0, 120)}</span>
                <span className="ml-2 text-steel">×{e.count}</span>
                {e.likelyFiles.length ? <span className="ml-2 text-steel">→ {e.likelyFiles[0]}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function SandboxTable({ rows }: { rows: SandboxRow[] }) {
  if (!rows.length) return <Empty label="sandbox runs" />;
  return (
    <table className="w-full text-xs">
      <thead className="text-left text-steel"><tr><th className="py-1">Plan</th><th>Repo</th><th>Status</th><th>Files</th><th>Created</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-line">
            <td className="py-1.5 text-ink">{r.planId}</td>
            <td className="text-graphite">{r.repositoryId}</td>
            <td><Tag s={r.status} /></td>
            <td>{r.modifiedFiles?.length ?? 0}</td>
            <td className="text-steel">{new Date(r.createdAt).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function JobsTable({ rows }: { rows: JobRow[] }) {
  if (!rows.length) return <Empty label="jobs" />;
  return (
    <table className="w-full text-xs">
      <thead className="text-left text-steel"><tr><th className="py-1">Type</th><th>Project</th><th>Status</th><th>Error</th><th>Updated</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-line">
            <td className="py-1.5 text-ink">{r.type}</td>
            <td className="text-graphite">{r.projectId}</td>
            <td><Tag s={r.status} /></td>
            <td className="max-w-[24ch] truncate text-red-700">{r.error ?? ""}</td>
            <td className="text-steel">{new Date(r.updatedAt).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function UsageView({ data }: { data: UsageBreakdown | null }) {
  if (!data) return <Empty label="usage events" />;
  const t = data.totals;
  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded bg-cloud p-2"><p className="text-steel">Calls</p><p className="text-lg font-semibold text-ink">{t?.calls ?? 0}</p></div>
        <div className="rounded bg-cloud p-2"><p className="text-steel">Credits</p><p className="text-lg font-semibold text-ink">{(t?.credits ?? 0).toLocaleString()}</p></div>
        <div className="rounded bg-cloud p-2"><p className="text-steel">Est cost (USD)</p><p className="text-lg font-semibold text-ink">${(t?.estimatedCostUsd ?? 0).toFixed(2)}</p></div>
      </div>
      <UsageBucketTable title="By user" rows={data.byUser} labelKey="userId" />
      <UsageBucketTable title="By model" rows={data.byModel} labelKey="model" />
      <UsageBucketTable title="By mode" rows={data.byMode} labelKey="mode" />
      <UsageBucketTable title="By task type" rows={data.byTaskType} labelKey="taskType" />
      <UsageBucketTable title="By status" rows={data.byStatus} labelKey="status" showCost={false} />
    </div>
  );
}

function UsageBucketTable({ title, rows, labelKey, showCost = true }: { title: string; rows: UsageBucket[]; labelKey: keyof UsageBucket; showCost?: boolean }) {
  if (!rows?.length) return null;
  return (
    <div>
      <p className="mb-1 font-medium text-ink">{title}</p>
      <table className="w-full">
        <thead className="text-left text-steel"><tr><th className="py-0.5">{String(labelKey)}</th><th>Calls</th>{showCost ? <><th>Credits</th><th>Cost</th></> : null}</tr></thead>
        <tbody>
          {rows.slice(0, 8).map((r, i) => (
            <tr key={`${title}-${i}`} className="border-t border-line">
              <td className="py-0.5 font-mono text-[11px] text-graphite">{(r[labelKey] as string) ?? "(unknown)"}</td>
              <td>{r.calls}</td>
              {showCost ? <><td>{(r.credits ?? 0).toLocaleString()}</td><td>${(r.cost ?? 0).toFixed(2)}</td></> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
