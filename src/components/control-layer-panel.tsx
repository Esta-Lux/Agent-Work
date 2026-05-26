"use client";

import { StatusPill } from "@/components/status-pill";
import type { ControlLayerSummary } from "@/lib/control/types";

export function ControlLayerPanel({ control }: { control: ControlLayerSummary }) {
  const { scopeContract, contextPlan, patchGuard, tokenEstimate, tokenWaste, regressionGuard, repositoryMap } =
    control;

  return (
    <div className="mt-4 space-y-4 rounded-lg border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase text-signal">AI coding control layer</p>
          <p className="mt-1 text-sm leading-6 text-graphite">
            BootRise stops agents from hallucinating, over-editing, and wasting tokens — scoped context, blast
            radius, diff budget, and guards before anything applies.
          </p>
        </div>
        <StatusPill
          label={control.canApprove ? "Ready for approval" : "Blocked"}
          tone={control.canApprove ? "passed" : "failed"}
        />
      </div>

      {control.stopReason ? (
        <p className="rounded-lg border border-critical/25 bg-critical/5 px-3 py-2 text-xs text-critical">
          {control.stopReason}
          {control.failedPatchAttempts >= 2 ? (
            <span className="mt-1 block text-steel">
              {control.failedPatchAttempts} recent blocked attempts — narrow scope before retrying.
            </span>
          ) : null}
        </p>
      ) : null}

      <section>
        <p className="text-xs font-semibold uppercase text-steel">1 · Task scope lock</p>
        <p className="mt-1 text-sm text-ink">{scopeContract.scopeLockMessage}</p>
        <p className="mt-1 text-xs text-graphite">
          Flow: {scopeContract.affectedUserFlow} · API: {scopeContract.apiImpact}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusPill label={scopeContract.taskType.replace("_", " ")} tone="neutral" />
          <StatusPill label={`≤${scopeContract.maxFilesChanged} files`} tone="neutral" />
          <StatusPill label={`≤${scopeContract.maxLinesChanged} lines`} tone="neutral" />
        </div>
        {scopeContract.testExpectations.length > 0 ? (
          <ul className="mt-2 list-inside list-disc text-xs text-steel">
            {scopeContract.testExpectations.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section>
        <p className="text-xs font-semibold uppercase text-steel">2 · Context budget</p>
        <p className="mt-1 text-sm text-graphite">{contextPlan.summary}</p>
        <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
          <div className="rounded border border-line bg-cloud px-2 py-2">
            <p className="font-semibold text-ink">Deep read</p>
            <p className="text-steel">{contextPlan.deepRead.length} files</p>
          </div>
          <div className="rounded border border-line bg-cloud px-2 py-2">
            <p className="font-semibold text-ink">Reference</p>
            <p className="text-steel">{contextPlan.reference.length} files</p>
          </div>
          <div className="rounded border border-line bg-cloud px-2 py-2">
            <p className="font-semibold text-ink">Excluded</p>
            <p className="text-steel">{contextPlan.excluded.length} files</p>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-steel">{tokenWaste.message}</p>
      </section>

      <section>
        <p className="text-xs font-semibold uppercase text-steel">Repository map</p>
        <p className="mt-1 text-xs text-graphite">{repositoryMap.summary}</p>
        <p className="mt-1 text-[11px] text-steel">
          {repositoryMap.routes.length} routes/screens · {repositoryMap.apiEndpoints.length} API modules ·{" "}
          {repositoryMap.highRiskFiles.length} high-risk paths
        </p>
      </section>

      <section>
        <p className="text-xs font-semibold uppercase text-steel">3 · File-touch contract</p>
        <ul className="mt-2 max-h-24 space-y-1 overflow-y-auto text-xs text-graphite">
          {scopeContract.allowedEditFiles.slice(0, 10).map((path) => (
            <li key={path} className="font-mono text-ink">
              ✎ {path}
            </li>
          ))}
        </ul>
        {scopeContract.readOnlyFiles.length > 0 ? (
          <p className="mt-2 text-[11px] text-steel">
            Read-only context: {scopeContract.readOnlyFiles.slice(0, 3).join(", ")}
            {scopeContract.readOnlyFiles.length > 3 ? "…" : ""}
          </p>
        ) : null}
        <p className="mt-1 text-[11px] text-steel">
          Forbidden unless re-approved: {scopeContract.forbiddenPatterns.slice(0, 4).join(", ")}
        </p>
      </section>

      <section>
        <p className="text-xs font-semibold uppercase text-steel">4 · Patch & diff guard</p>
        <p className="mt-1 text-xs text-graphite">
          {patchGuard.filesChanged} file(s) · ~{patchGuard.linesChanged} lines · {patchGuard.newFiles} new · ~$
          {tokenEstimate.estimatedUsd.toFixed(2)}
        </p>
        {patchGuard.findings.length > 0 ? (
          <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto">
            {patchGuard.findings.map((f) => (
              <li
                key={f.id}
                className={`rounded px-2 py-1 text-xs ${
                  f.severity === "block"
                    ? "border border-critical/30 bg-critical/5 text-critical"
                    : "border border-amber-200/60 bg-amber-50 text-amber-950"
                }`}
              >
                {f.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-signal">No guard violations detected.</p>
        )}
      </section>

      <section>
        <p className="text-xs font-semibold uppercase text-steel">7 · Regression shield</p>
        <p className="mt-1 text-xs text-graphite">{regressionGuard.summary}</p>
        <ul className="mt-2 space-y-1">
          {regressionGuard.checks.map((c) => (
            <li key={c.id} className="text-xs text-graphite">
              <span
                className={
                  c.status === "passed" ? "text-signal" : c.status === "failed" ? "text-critical" : "text-amber-800"
                }
              >
                {c.status === "passed" ? "✓" : c.status === "failed" ? "✗" : "!"}
              </span>{" "}
              {c.label}: {c.detail}
            </li>
          ))}
        </ul>
        {regressionGuard.executedCommands.length > 0 ? (
          <ul className="mt-2 max-h-24 space-y-1 overflow-y-auto text-[11px] text-steel">
            {regressionGuard.executedCommands.map((cmd) => (
              <li key={cmd.label}>
                {cmd.exitCode === 0 ? "✓" : "✗"} {cmd.label}
              </li>
            ))}
          </ul>
        ) : regressionGuard.suggestedCommands.length > 0 ? (
          <p className="mt-2 text-[11px] text-steel">
            Suggested: {regressionGuard.suggestedCommands.join(" · ")}
          </p>
        ) : null}
      </section>
    </div>
  );
}
