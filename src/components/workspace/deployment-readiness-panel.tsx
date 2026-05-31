"use client";

import { CommandButton } from "@/components/ui/command-button";
import { StatusPill } from "@/components/ui/status-pill";
import type { DeploymentReadinessResult } from "@/lib/security/types";

interface DeploymentReadinessPanelProps {
  report: DeploymentReadinessResult | null;
  checkedAt: string | null;
  busy?: boolean;
  onRun: () => void;
}

export function DeploymentReadinessPanel({ report, checkedAt, busy, onRun }: DeploymentReadinessPanelProps) {
  return (
    <section className="rounded-lg bg-card-ws p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-ws-3">Deployment readiness</p>
          <p className="mt-1 text-sm font-semibold text-text-ws-1">Staging and production preflight</p>
          <p className="mt-1 text-xs leading-5 text-text-ws-2">
            {checkedAt ? `Checked ${checkedAt}` : "Run readiness before relying on deploy status."}
          </p>
        </div>
        <StatusPill variant={statusVariant(report?.status)} label={report?.status.replace(/_/g, " ") ?? "not run"} />
      </div>
      <CommandButton theme="workspace" variant="secondary" size="sm" label="Run deploy readiness" loading={busy} className="mt-3 w-full" onClick={onRun} />
      {report ? (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <ReadinessFlag label="Safe for staging" ready={report.status === "safe_for_staging" || report.status === "production_candidate" || report.status === "production_ready"} />
            <ReadinessFlag label="Safe for production" ready={report.status === "production_ready"} />
          </div>
          <TextList title="Blockers" items={(report.blockers ?? []).map((finding) => `${finding.file ? `${finding.file}: ` : ""}${finding.title}`)} tone="red" />
          <TextList title="Warnings" items={(report.warnings ?? []).map((finding) => `${finding.file ? `${finding.file}: ` : ""}${finding.title}`)} tone="amber" />
          <TextList title="Missing production items" items={report.missingProductionItems ?? []} tone="muted" />
        </div>
      ) : (
        <p className="mt-3 text-xs leading-5 text-text-ws-2">No deployment readiness result yet.</p>
      )}
    </section>
  );
}

function ReadinessFlag({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="rounded-md bg-black/20 p-2">
      <p className="font-mono text-[10px] uppercase tracking-widest text-text-ws-3">{label}</p>
      <p className={`mt-1 text-xs font-semibold ${ready ? "text-signal-text" : "text-amber-300"}`}>{ready ? "Ready" : "Not yet"}</p>
    </div>
  );
}

function TextList({ title, items, tone }: { title: string; items: string[]; tone: "red" | "amber" | "muted" }) {
  if (items.length === 0) return null;
  const color = tone === "red" ? "text-red-300" : tone === "amber" ? "text-amber-300" : "text-text-ws-2";
  return (
    <div>
      <p className="text-xs font-semibold text-text-ws-1">{title}</p>
      <ul className={`mt-1 space-y-1 text-xs leading-5 ${color}`}>
        {items.slice(0, 5).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function statusVariant(status?: DeploymentReadinessResult["status"]) {
  if (status === "production_ready" || status === "production_candidate" || status === "safe_for_staging") return "signal";
  if (status === "blocked") return "red";
  return "amber";
}
