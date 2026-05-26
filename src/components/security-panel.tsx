"use client";

import { useState } from "react";
import type { SecurityFinding } from "@/lib/security/types";
import type { DeploymentReadinessResult } from "@/lib/security/types";

export function SecurityPanel({
  filesJson,
  onScan
}: {
  filesJson: string;
  onScan?: () => void;
}) {
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [readiness, setReadiness] = useState<DeploymentReadinessResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function runScan() {
    setBusy(true);
    try {
      const files = JSON.parse(filesJson) as Array<{ path: string; content: string }>;
      const [sec, dep] = await Promise.all([
        fetch("/api/workspace/security/scan", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files })
        }),
        fetch("/api/workspace/deploy/readiness", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files })
        })
      ]);
      const secData = await sec.json();
      const depData = await dep.json();
      if (sec.ok) setFindings(secData.findings ?? []);
      if (dep.ok) setReadiness(depData.report ?? null);
      onScan?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        disabled={busy}
        className="rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        onClick={() => void runScan()}
      >
        {busy ? "Scanning…" : "Run security & deployment scan"}
      </button>
      {readiness ? (
        <div className="rounded-lg border border-line p-3">
          <p className="text-sm font-semibold text-ink">Deployment readiness: {readiness.score}/100</p>
          <p className="text-xs text-steel">Status: {readiness.status}</p>
        </div>
      ) : null}
      <ul className="space-y-2">
        {findings.map((f) => (
          <li key={f.id} className="rounded border border-line p-2 text-sm">
            <span className={`text-xs font-semibold ${f.severity === "critical" ? "text-red-600" : "text-amber-700"}`}>
              {f.severity}
            </span>
            <p className="font-medium">{f.title}</p>
            <p className="text-steel">{f.whyItMatters}</p>
            {f.file ? <p className="font-mono text-xs">{f.file}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
