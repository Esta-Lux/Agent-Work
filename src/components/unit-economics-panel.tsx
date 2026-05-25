import { getUnitEconomics } from "@/lib/business/unit-economics";

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
    style: "currency"
  }).format(value);
}

export function UnitEconomicsPanel() {
  const economics = getUnitEconomics();

  return (
    <section className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-steel">Unit Economics</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Pricing, free trial, and growth model</h2>
        </div>
        <a className="rounded border border-line bg-white px-4 py-2 text-sm font-semibold text-graphite" href="/api/admin/unit-economics">
          View JSON
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric title="Light verified task" value={money(economics.taskCosts.lightTaskCost)} detail="GPT-5.5 planner, Sonnet worker, 10 min sandbox, logs." />
        <Metric title="Heavy verified task" value={money(economics.taskCosts.heavyTaskCost)} detail="Larger context, Opus review path, 45 min sandbox." />
        <Metric
          title="7-day trial cost"
          value={money(economics.trial.estimatedCostPerTrial)}
          detail={`${economics.trial.includedTasks} capped verified tasks per trial account.`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {economics.scenarios.map((scenario) => (
          <article className="rounded border border-line bg-white p-4" key={scenario.label}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-steel">{scenario.label}</p>
                <h3 className="mt-1 text-xl font-semibold text-ink">{scenario.users.toLocaleString()} users</h3>
              </div>
              <span className="rounded bg-signal px-3 py-1 text-sm font-semibold text-white">
                {scenario.grossMargin}% margin
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Mini label="Monthly tasks" value={scenario.monthlyTasks.toLocaleString()} />
              <Mini label="AI + sandbox" value={money(scenario.aiAndSandboxCost)} />
              <Mini label="Platform" value={money(scenario.platformCost)} />
              <Mini label="Support + ops" value={money(scenario.supportAndOpsCost)} />
              <Mini label="Revenue @ $99 blend" value={money(scenario.revenueAtRecommendedBlend)} />
              <Mini label="Gross profit" value={money(scenario.grossProfit)} />
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {economics.plans.map((plan) => (
          <article className="rounded border border-line bg-white p-4" key={plan.name}>
            <p className="text-sm font-semibold uppercase text-steel">{plan.name}</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{money(plan.monthlyPrice)}</p>
            <p className="mt-2 text-sm text-graphite">{plan.targetUser}</p>
            <p className="mt-4 text-sm font-semibold text-ink">{plan.includedTasks} included verified tasks</p>
            <p className="mt-1 text-sm text-steel">{money(plan.overagePerTask)} per extra task</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <article className="rounded border border-line bg-white p-4">
          <p className="text-sm font-semibold uppercase text-steel">7-Day Free Trial</p>
          <h3 className="mt-2 text-xl font-semibold text-ink">Yes, but cap it tightly</h3>
          <p className="mt-3 text-sm leading-6 text-graphite">{economics.trial.recommendation}</p>
          <div className="mt-4 rounded bg-cloud p-3 text-sm font-semibold text-ink">
            Require account verification before sandbox execution and throttle failed self-healing loops.
          </div>
        </article>

        <article className="rounded border border-line bg-white p-4">
          <p className="text-sm font-semibold uppercase text-steel">AI Engine Status</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {economics.engineStatus.map((engine) => (
              <div className="rounded border border-line bg-cloud p-3" key={engine.engine}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">{engine.engine}</p>
                  <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-graphite">{engine.status}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-steel">{engine.note}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function Metric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <article className="rounded border border-line bg-white p-4">
      <p className="text-sm font-semibold text-steel">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-sm leading-6 text-graphite">{detail}</p>
    </article>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-cloud p-3">
      <p className="text-xs font-semibold uppercase text-steel">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}
