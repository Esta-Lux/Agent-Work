"use client";

import { CommandButton } from "@/components/ui/command-button";
import { StatusPill } from "@/components/ui/status-pill";
import type { SecurityFinding } from "@/lib/security/types";

interface SecurityCenterPanelProps {
  findings: SecurityFinding[] | null;
  score: number | null;
  criticalCount: number | null;
  busy?: boolean;
  onRun: () => void;
}

const CATEGORY_LABELS: Array<{ key: SecurityFinding["category"]; label: string }> = [
  { key: "secret", label: "Secrets" },
  { key: "api", label: "Client/server boundary" },
  { key: "authorization", label: "Authorization" },
  { key: "database", label: "Supabase RLS" },
  { key: "payment", label: "Stripe" },
  { key: "logging", label: "Logging" },
  { key: "dependency", label: "Dependencies" },
  { key: "deployment", label: "Deployment" },
  { key: "auth", label: "Auth" }
];

export function SecurityCenterPanel({ findings, score, criticalCount, busy, onRun }: SecurityCenterPanelProps) {
  return (
    <section className="rounded-lg bg-card-ws p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-ws-3">Security center</p>
          <p className="mt-1 text-sm font-semibold text-text-ws-1">Repository security scan</p>
          <p className="mt-1 text-xs leading-5 text-text-ws-2">Run a deterministic scan before export or draft PR.</p>
        </div>
        <StatusPill
          variant={criticalCount && criticalCount > 0 ? "red" : typeof score === "number" ? "signal" : "amber"}
          label={typeof score === "number" ? `${score}/100` : "not run"}
        />
      </div>
      <CommandButton theme="workspace" variant="secondary" size="sm" label="Run security scan" loading={busy} className="mt-3 w-full" onClick={onRun} />
      {findings ? (
        <div className="mt-3 space-y-3">
          {CATEGORY_LABELS.map(({ key, label }) => {
            const grouped = findings.filter((finding) => finding.category === key);
            if (grouped.length === 0) return null;
            return (
              <div key={key}>
                <p className="text-xs font-semibold text-text-ws-1">{label}</p>
                <div className="mt-1 space-y-1">
                  {grouped.slice(0, 4).map((finding) => (
                    <div key={finding.id} className="rounded-md bg-black/20 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-text-ws-1">{finding.title}</p>
                        <StatusPill variant={finding.severity === "critical" ? "red" : finding.severity === "high" ? "amber" : "blue"} label={finding.severity} />
                      </div>
                      {finding.file ? <p className="mt-1 truncate font-mono text-[11px] text-text-ws-3" title={finding.file}>{finding.file}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {findings.length === 0 ? <p className="text-xs text-text-ws-2">No findings were returned by the scan.</p> : null}
        </div>
      ) : (
        <p className="mt-3 text-xs leading-5 text-text-ws-2">Security scan has not run for this workspace snapshot yet.</p>
      )}
    </section>
  );
}
