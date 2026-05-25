import { getProductionReadinessReport } from "@/lib/admin/readiness";

const toneByStatus = {
  ready: "bg-signal text-white",
  partial: "bg-amber-50 text-caution",
  missing: "bg-red-50 text-critical"
};

export function ProductionReadinessPanel() {
  const report = getProductionReadinessReport();

  return (
    <section className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-steel">Production Readiness</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">What BootRise still needs before launch</h2>
        </div>
        <div className="rounded border border-line bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase text-steel">Readiness score</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{report.score}%</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {report.items.map((item) => (
          <article className="rounded border border-line bg-white p-4" key={item.area}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-ink">{item.area}</h3>
              <span className={`rounded px-2 py-1 text-xs font-semibold ${toneByStatus[item.status]}`}>{item.status}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-graphite">{item.summary}</p>
            <p className="mt-4 text-sm font-semibold text-steel">{item.nextStep}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
