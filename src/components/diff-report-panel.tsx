"use client";

import { StatusPill } from "@/components/status-pill";
import type { WorkspaceFixReport } from "@/lib/workspace/workspace-types";

export function DiffReportPanel({ report }: { report: WorkspaceFixReport }) {
  const isPreviewScaffold = report.fixed.some((f) => f.path.startsWith("generated/"));

  return (
    <div className="rounded border border-line bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">Fix and diff report</p>
        <StatusPill label={report.plan.risk.level} tone={report.plan.risk.level === "high" ? "failed" : "neutral"} />
      </div>

      {isPreviewScaffold ? (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
          Preview only: BootRise did not edit your imported repo files. The diff below is a generated scaffold for review —
          apply real changes in your repository after you approve the plan.
        </p>
      ) : null}

      <p className="text-sm text-graphite">{report.plan.intent.interpretedGoal}</p>

      {report.plainEnglishSummary ? (
        <section className="mt-4 rounded-lg border border-signal/20 bg-signal/5 p-3">
          <p className="text-xs font-semibold uppercase text-signal">In plain English</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-graphite">{report.plainEnglishSummary}</p>
        </section>
      ) : null}

      <section className="mt-4">
        <p className="text-xs font-semibold uppercase text-steel">Fixed files</p>
        <ul className="mt-2 space-y-2">
          {report.fixed.map((file) => (
            <li key={file.path} className="rounded border border-line bg-cloud p-2 text-xs">
              <p className="font-semibold text-ink">{file.path}</p>
              <p className="text-graphite">{file.summary}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4">
        <p className="text-xs font-semibold uppercase text-steel">Diff preview</p>
        <div className="mt-2 max-h-72 space-y-2 overflow-y-auto">
          {report.diff.files.map((file) => (
            <details key={file.path} className="rounded border border-line bg-cloud p-2">
              <summary className="cursor-pointer text-xs font-semibold text-ink">{file.path}</summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-ink p-2 text-[11px] leading-4 text-white">{file.after}</pre>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-4">
        <p className="text-xs font-semibold uppercase text-steel">May break</p>
        <ul className="mt-1 list-inside list-disc text-xs text-graphite">
          {report.potentiallyBroken.length ? report.potentiallyBroken.map((item) => <li key={item}>{item}</li>) : <li>None flagged</li>}
        </ul>
      </section>

      <section className="mt-4">
        <p className="text-xs font-semibold uppercase text-steel">How it was fixed</p>
        <ul className="mt-1 list-inside list-disc text-xs text-steel">
          {report.howFixed.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
