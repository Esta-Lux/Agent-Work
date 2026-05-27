"use client";

import type { ReviewFinding } from "@/lib/workspace/review-findings";

export function ReviewFindingsPanel({
  findings,
  coverage,
  onRunFix
}: {
  findings: ReviewFinding[];
  coverage?: string;
  onRunFix?: (finding: ReviewFinding) => void;
}) {
  if (!findings.length) {
    return <p className="text-sm text-steel">No prioritized findings yet — run a repo review in chat or Security scan.</p>;
  }

  return (
    <div className="space-y-3">
      {coverage ? <p className="text-xs text-steel">{coverage}</p> : null}
      <ul className="space-y-2">
        {findings.slice(0, 12).map((f) => (
          <li key={f.id} className="rounded-lg border border-line bg-white p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-cloud px-1.5 py-0.5 text-[10px] font-bold text-signal">P{f.priority}</span>
              <span
                className={`text-[10px] font-semibold uppercase ${
                  f.severity === "critical" || f.severity === "high" ? "text-critical" : "text-amber-800"
                }`}
              >
                {f.severity}
              </span>
              <span className="text-[10px] uppercase text-steel">{f.area}</span>
              <span className="text-[10px] text-steel">via {f.source}</span>
            </div>
            <p className="mt-1 font-semibold text-ink">{f.title}</p>
            <p className="mt-1 text-graphite">{f.detail}</p>
            {f.paths.length ? (
              <p className="mt-1 font-mono text-[10px] text-steel">{f.paths.slice(0, 5).join(" · ")}</p>
            ) : null}
            <p className="mt-2 text-xs text-signal">{f.suggestedAction}</p>
            {onRunFix ? (
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-signal hover:underline"
                onClick={() => onRunFix(f)}
              >
                Run Fix on this finding
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
