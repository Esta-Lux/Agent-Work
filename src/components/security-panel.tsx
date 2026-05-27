"use client";

import { useState } from "react";
import type { SecurityFinding } from "@/lib/security/types";
import type { DeploymentReadinessResult } from "@/lib/security/types";
import { CreditConfirmDialog } from "@/components/credit-confirm-dialog";
import { ScoreRing } from "@/components/ui/score-ring";
import { estimateCreditsForAction } from "@/lib/usage/credit-pricing";
import { ReviewFindingsPanel } from "@/components/review-findings-panel";
import { fromSecurityFindings, mergeReviewFindings } from "@/lib/workspace/review-findings";

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
  onScanComplete?: (result: {
    criticalCount: number;
    readiness: DeploymentReadinessResult | null;
    findings: SecurityFinding[];
  }) => void;
}) {
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [readiness, setReadiness] = useState<DeploymentReadinessResult | null>(null);
  const [semgrepMeta, setSemgrepMeta] = useState<{ ran: boolean; skippedReason?: string; count: number } | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const estimatedCredits = estimateCreditsForAction(SCAN_ACTION);

  async function runScan() {
    setBusy(true);
    setConfirmOpen(false);
    setScanError(null);
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
      const readiness = dep.ok ? (depData.report as DeploymentReadinessResult | null) ?? null : null;
      if (sec.ok) {
        const mergedFindings = (secData.findings ?? []) as SecurityFinding[];
        setFindings(mergedFindings);
        setSemgrepMeta(secData.semgrep ?? null);
        const critical = secData.criticalCount ?? 0;
        onScanComplete?.({ criticalCount: critical, readiness, findings: mergedFindings });
      } else {
        setScanError(secData.error ?? "Security scan failed.");
      }
      if (dep.ok) setReadiness(readiness);
      else if (!sec.ok) setScanError((prev) => prev ?? depData.error ?? "Deployment readiness check failed.");
    } finally {
      setBusy(false);
    }
  }

  const prioritized = mergeReviewFindings(
    fromSecurityFindings(findings.filter((f) => !f.id.startsWith("semgrep:"))),
    fromSecurityFindings(
      findings.filter((f) => f.id.startsWith("semgrep:")),
      "semgrep"
    )
  );

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
        reason="BootRise rules + optional Semgrep static analysis. Critical findings block Safe to deploy."
        onConfirm={() => void runScan()}
        onCancel={() => setConfirmOpen(false)}
      />
      {scanError ? (
        <p className="rounded-lg border border-critical/30 bg-critical/5 px-3 py-2 text-xs text-critical">{scanError}</p>
      ) : null}
      {semgrepMeta ? (
        <p className="text-xs text-steel">
          Semgrep:{" "}
          {semgrepMeta.ran
            ? `${semgrepMeta.count} finding(s) merged`
            : semgrepMeta.skippedReason ?? "not run — set BOOTRISE_SEMGREP=1 and install semgrep CLI"}
        </p>
      ) : null}
      {readiness ? (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line p-4">
          <ScoreRing score={readiness.score} label="Deploy score" />
          <div>
            <p className="text-sm font-semibold text-ink">Status: {readiness.status.replace(/_/g, " ")}</p>
            <p className="text-xs text-steel">
              {readiness.blockers.length} blocker(s), {readiness.warnings.length} warning(s)
              {readiness.status === "blocked" ? " — Safe to deploy is blocked" : ""}
            </p>
          </div>
        </div>
      ) : null}
      {prioritized.length > 0 ? (
        <PanelSection title="Prioritized findings">
          <ReviewFindingsPanel findings={prioritized} />
        </PanelSection>
      ) : null}
      <PanelSection title="All findings">
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
              {f.blocksDeployment ? (
                <p className="mt-1 text-xs font-semibold text-critical">Blocks deployment</p>
              ) : null}
            </li>
          ))}
        </ul>
      </PanelSection>
    </div>
  );
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase text-steel">{title}</p>
      {children}
    </div>
  );
}
