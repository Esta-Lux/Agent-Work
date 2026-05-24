import { StatusPill } from "@/components/status-pill";
import type { VerificationSummary } from "@/lib/verification/verification-summary";

interface EvidencePanelProps {
  verification: VerificationSummary;
}

export function EvidencePanel({ verification }: EvidencePanelProps) {
  return (
    <section className="rounded border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-steel">Verification Evidence</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Checks required before trust</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill label={`${verification.total} checks`} />
          <StatusPill label={`${verification.blocking} blocking`} tone="medium" />
          <StatusPill label={`${verification.pending} pending`} tone="pending" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-3 md:grid-cols-2">
          {verification.checks.map((check) => (
            <div key={check.id} className="rounded border border-line bg-cloud p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{check.title}</p>
                  <p className="mt-1 text-xs uppercase text-steel">{check.kind}</p>
                </div>
                <StatusPill label={check.status} tone={check.status} />
              </div>
              {check.command ? <p className="mt-4 rounded bg-white px-3 py-2 text-xs text-graphite">{check.command}</p> : null}
            </div>
          ))}
        </div>

        <div className="rounded border border-line bg-ink p-4 text-white">
          <p className="text-sm font-semibold uppercase text-white/60">Execution Gate</p>
          <p className="mt-3 text-sm leading-6 text-white/75">
            Approved edits should stay blocked until required validation evidence is attached. Failed checks should move the
            change into repair or rollback.
          </p>
        </div>
      </div>
    </section>
  );
}

