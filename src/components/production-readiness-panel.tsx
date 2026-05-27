import { getProductionReadinessReport } from "@/lib/admin/readiness";
import { StatusPill } from "@/components/status-pill";
import { MetricTile } from "@/components/ui/metric-tile";
import { PanelShell } from "@/components/ui/panel-shell";

export async function ProductionReadinessPanel() {
  const report = await getProductionReadinessReport();

  return (
    <section className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-steel">Production Readiness</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">What BootRise still needs before launch</h2>
          <p className="mt-1 text-sm text-steel">
            Production ready: {report.productionReady ? "Yes" : "No — complete P0 areas and disable dev bypass."}
          </p>
        </div>
        <MetricTile label="Readiness score" value={`${report.score}%`} size="hero" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {report.items.map((item) => (
          <PanelShell title={item.area} key={item.area} action={
            <StatusPill
              label={item.status}
              tone={item.status === "ready" ? "passed" : item.status === "partial" ? "medium" : "failed"}
            />
          }>
            <p className="mt-3 text-sm leading-6 text-graphite">{item.summary}</p>
            <p className="mt-4 text-sm font-semibold text-steel">{item.nextStep}</p>
          </PanelShell>
        ))}
      </div>
    </section>
  );
}
