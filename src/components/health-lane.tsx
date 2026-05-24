import { StatusPill } from "@/components/status-pill";
import type { RepoHealthSummary } from "@/lib/reporting/repo-health";

interface HealthLaneProps {
  health: RepoHealthSummary;
}

export function HealthLane({ health }: HealthLaneProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="rounded border border-line bg-ink p-5 text-white">
        <p className="text-sm font-semibold uppercase text-white/60">Repo Health</p>
        <p className="mt-4 text-6xl font-semibold">{health.score}</p>
        <p className="mt-3 text-sm leading-6 text-white/70">
          Composite readiness score from test surface, coupling, schema risk, and dependency signals.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {health.signals.map((signal) => (
          <div key={signal.id} className="rounded border border-line bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-ink">{signal.label}</p>
              <StatusPill label={signal.level} tone={signal.level} />
            </div>
            <p className="mt-4 text-2xl font-semibold text-ink">{signal.value}</p>
            <p className="mt-2 text-sm leading-6 text-graphite">{signal.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

