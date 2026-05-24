import { StatusPill } from "@/components/status-pill";

const operationSurfaces = [
  {
    title: "Last 100 Runs",
    endpoint: "GET /api/runs",
    body: "Returns sandbox runs, dynamic pulses, rollback snapshots, and self-healing attempts."
  },
  {
    title: "Dynamic Pulse",
    endpoint: "POST /api/pulses",
    body: "Records runtime, database, network, terminal, or test events into the memory loop."
  },
  {
    title: "Rollback Snapshots",
    endpoint: "GET /api/rollbacks",
    body: "Lists file contents captured before guarded orchestrator writes."
  },
  {
    title: "Self-Healing Queue",
    endpoint: "GET /api/self-healing",
    body: "Shows proposed repair attempts generated from failed sandbox runs."
  }
];

export function OperationsLedgerPanel() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-4">
      <div className="rounded border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-steel">Operational Memory</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Runs, rollback, and recovery</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-graphite">
              BootRise now stores the operational side of time: what ran, what failed, what changed, what can be rolled
              back, and what repair should be proposed next.
            </p>
          </div>
          <StatusPill label="last 100 runs ready" tone="low" />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {operationSurfaces.map((surface) => (
            <div key={surface.endpoint} className="rounded border border-line bg-cloud p-4">
              <p className="text-xs font-semibold uppercase text-signal">{surface.endpoint}</p>
              <h3 className="mt-2 text-base font-semibold text-ink">{surface.title}</h3>
              <p className="mt-2 text-sm leading-6 text-graphite">{surface.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

