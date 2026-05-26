"use client";

import { useState } from "react";
import type { SecurityFinding } from "@/lib/security/types";
import type { DeploymentReadinessResult } from "@/lib/security/types";
import { CreditConfirmDialog } from "@/components/credit-confirm-dialog";
import { ScoreRing } from "@/components/ui/score-ring";
import { estimateCreditsForAction } from "@/lib/usage/credit-pricing";

const SCAN_ACTION = "basic_security_scan";

export function SecurityPanel({
  filesJson,
  projectId,
  creditsRemaining,
  onScanComplete
}: {
  filesJson: string;
  projectId?: string;
  creditsRemaining?: number | null;
  onScanComplete?: (criticalCount: number) => void;
}) {
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [readiness, setReadiness] = useState<DeploymentReadinessResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const estimatedCredits = estimateCreditsForAction(SCAN_ACTION);

  async function runScan() {
    setBusy(true);
    setConfirmOpen(false);
    try {
      const files = JSON.parse(filesJson) as Array<{ path: string; content: string }>;
      const [sec, dep] = await Promise.all([
        fetch("/api/workspace/security/scan", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files, projectId })
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
      if (sec.ok) {
        setFindings(secData.findings ?? []);
        const critical = secData.criticalCount ?? 0;
        onScanComplete?.(critical);
      }
      if (dep.ok) setReadiness(depData.report ?? null);
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
        onClick={() => setConfirmOpen(true)}
      >
        {busy ? "Scanning…" : "Run security & deployment scan"}
      </button>
      <CreditConfirmDialog
        open={confirmOpen}
        action={SCAN_ACTION}
        estimatedCredits={estimatedCredits}
        remaining={creditsRemaining ?? 0}
        reason="Security mode scans your imported files for secrets, auth gaps, and deployment risks."
        onConfirm={() => void runScan()}
        onCancel={() => setConfirmOpen(false)}
      />
      {readiness ? (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line p-4">
          <ScoreRing score={readiness.score} label="Deploy score" />
          <div>
            <p className="text-sm font-semibold text-ink">Status: {readiness.status.replace(/_/g, " ")}</p>
            <p className="text-xs text-steel">
              {readiness.blockers.length} blocker(s), {readiness.warnings.length} warning(s)
            </p>
          </div>
        </div>
      ) : null}
      <ul className="space-y-2">
        {findings.map((f) => (
          <li key={f.id} className="rounded-lg border border-line p-3 text-sm">
            <span className={`text-xs font-semibold uppercase ${f.severity === "critical" ? "text-critical" : "text-amber-700"}`}>
              {f.severity}
            </span>
            <p className="mt-1 font-medium text-ink">{f.title}</p>
            <p className="text-steel">{f.whyItMatters}</p>
            <p className="mt-1 text-xs text-graphite">{f.recommendedFix}</p>
            {f.file ? <p className="mt-1 font-mono text-xs text-steel">{f.file}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
