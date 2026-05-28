"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusPill } from "@/components/status-pill";

interface DetectionRow {
  id: string;
  kind: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  affectedPaths?: string[];
  detectedAt: string;
  source: string;
  status: "new" | "acknowledged" | "resolved" | "false_positive";
}

interface WatchdogStatus {
  running: boolean;
  lastTickAt: string | null;
  lastDetections: number;
}

const SEVERITY_TONE: Record<DetectionRow["severity"], "warning" | "danger" | "neutral"> = {
  info: "neutral",
  warning: "warning",
  critical: "danger"
};

export function AdminDetectionsPanel() {
  const [rows, setRows] = useState<DetectionRow[]>([]);
  const [watchdog, setWatchdog] = useState<WatchdogStatus | null>(null);
  const [filter, setFilter] = useState<{ kind: string; severity: string; status: string }>({ kind: "", severity: "", status: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter.kind) params.set("kind", filter.kind);
      if (filter.severity) params.set("severity", filter.severity);
      if (filter.status) params.set("status", filter.status);
      const res = await fetch(`/api/admin/agent/detections?${params.toString()}`);
      const body = (await res.json()) as { detections?: DetectionRow[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Failed to load detections.");
      setRows(body.detections ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load detections.");
    }
  }, [filter]);

  const loadWatchdog = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/agent/watchdog`);
      const body = (await res.json()) as WatchdogStatus;
      setWatchdog(body);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    void load();
    void loadWatchdog();
  }, [load, loadWatchdog]);

  async function runScan() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/agent/detections`, { method: "POST" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Scan failed.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Scan failed.");
    } finally {
      setBusy(false);
    }
  }

  async function acknowledge(id: string, status: DetectionRow["status"]) {
    setBusy(true);
    try {
      await fetch(`/api/admin/agent/detections/${encodeURIComponent(id)}/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function fixIt(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/agent/detections/${encodeURIComponent(id)}/fix`, { method: "POST" });
      const body = (await res.json()) as { pendingFixId?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Fix dispatch failed.");
      if (body.pendingFixId) {
        try {
          window.localStorage.setItem("bootrise.admin.lastDetectionFix", body.pendingFixId);
        } catch {
          /* ignore */
        }
        window.dispatchEvent(new CustomEvent("bootrise:focus-self-agent", { detail: { pendingFixId: body.pendingFixId } }));
      }
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Fix dispatch failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill label={watchdog?.running ? "Watchdog running" : "Watchdog off"} tone={watchdog?.running ? "passed" : "warning"} />
        <button type="button" onClick={() => void runScan()} disabled={busy} className="rounded border border-line bg-white px-2 py-1 font-semibold text-graphite hover:bg-cloud disabled:opacity-50">
          {busy ? "Working…" : "Run scan now"}
        </button>
        <select value={filter.kind} onChange={(e) => setFilter((f) => ({ ...f, kind: e.target.value }))} className="rounded border border-line bg-white px-2 py-1">
          <option value="">All kinds</option>
          {["auth_missing","org_scoping_missing","client_server_boundary","audit_log_missing","runtime_failure_cluster","usage_failure_spike","pending_fix_failure","security_finding"].map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select value={filter.severity} onChange={(e) => setFilter((f) => ({ ...f, severity: e.target.value }))} className="rounded border border-line bg-white px-2 py-1">
          <option value="">All severities</option>
          {["info","warning","critical"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))} className="rounded border border-line bg-white px-2 py-1">
          <option value="">All statuses</option>
          {["new","acknowledged","resolved","false_positive"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {error ? <p className="rounded border border-critical/30 bg-critical/5 p-2 text-critical">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="text-steel">No detections recorded yet. Click <em>Run scan now</em>.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded border border-line bg-white p-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill label={row.severity} tone={SEVERITY_TONE[row.severity]} />
                <StatusPill label={row.kind} />
                <StatusPill label={row.status} tone={row.status === "resolved" ? "passed" : "neutral"} />
                <span className="ml-auto text-steel">{new Date(row.detectedAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 font-semibold text-ink">{row.title}</p>
              <p className="text-steel">{row.description}</p>
              {row.affectedPaths?.length ? (
                <p className="mt-1 font-mono text-[11px] text-graphite">{row.affectedPaths.join(", ")}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => void fixIt(row.id)} disabled={busy} className="rounded border border-line bg-cloud px-2 py-0.5 font-semibold text-graphite hover:bg-white">Fix it</button>
                <button type="button" onClick={() => void acknowledge(row.id, "acknowledged")} disabled={busy} className="rounded border border-line bg-white px-2 py-0.5 hover:bg-cloud">Acknowledge</button>
                <button type="button" onClick={() => void acknowledge(row.id, "false_positive")} disabled={busy} className="rounded border border-line bg-white px-2 py-0.5 hover:bg-cloud">False positive</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
