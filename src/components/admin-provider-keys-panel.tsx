"use client";

import { useEffect, useState } from "react";
import { StatusPill } from "@/components/status-pill";

interface ProviderKeyRow {
  id: string;
  present: boolean;
  masked: string | null;
  envVar: string;
  hint: string;
}

interface ProviderKeysResponse {
  statuses: ProviderKeyRow[];
  envSnippet: string;
  ready: boolean;
}

export function AdminProviderKeysPanel() {
  const [data, setData] = useState<ProviderKeysResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/admin/agent/provider-keys");
      const body = (await res.json()) as ProviderKeysResponse & { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Failed to load provider keys.");
      setData(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load provider keys.");
    }
  }

  async function copySnippet() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.envSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Clipboard unavailable in this browser.");
    }
  }

  if (error) {
    return <p className="rounded border border-critical/30 bg-critical/5 p-2 text-xs text-critical">{error}</p>;
  }
  if (!data) {
    return <p className="text-xs text-steel">Loading provider keys…</p>;
  }

  return (
    <div className="mb-3 rounded-lg border border-line bg-cloud/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-graphite">Provider keys</h4>
        <StatusPill
          label={data.ready ? "ready" : "missing primary"}
          tone={data.ready ? "passed" : "warning"}
        />
        <button
          type="button"
          onClick={() => void load()}
          className="ml-auto text-xs text-signal underline-offset-2 hover:underline"
        >
          Refresh
        </button>
      </div>
      <ul className="space-y-1.5 text-xs">
        {data.statuses.map((row) => (
          <li key={row.id} className="flex items-center gap-2">
            <StatusPill label={row.present ? "present" : "absent"} tone={row.present ? "passed" : "warning"} />
            <code className="font-mono text-graphite">{row.envVar}</code>
            <span className="text-steel">{row.present ? row.masked : row.hint}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-semibold text-graphite">.env snippet</span>
          <button
            type="button"
            onClick={() => void copySnippet()}
            className="rounded border border-line bg-white px-2 py-0.5 text-xs text-graphite hover:bg-cloud"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="max-h-32 overflow-auto rounded border border-line bg-white p-2 font-mono text-[11px] leading-4 text-graphite">
{data.envSnippet}
        </pre>
      </div>
    </div>
  );
}
