import { StatusPill } from "@/components/status-pill";
import type { ChangePlan } from "@/lib/types/core";

interface PlanPanelProps {
  plan: ChangePlan;
}

export function PlanPanel({ plan }: PlanPanelProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="rounded border border-line bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Analysis</h2>
          <StatusPill label={`${plan.risk.level} risk`} tone={plan.risk.level} />
        </div>
        <p className="text-sm leading-6 text-graphite">{plan.intent.interpretedGoal}</p>
        <div className="mt-5">
          <h3 className="text-sm font-semibold">Impacted Systems</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {[...plan.impact.services, ...plan.impact.apis, ...plan.impact.databaseSchemas].map((item) => (
              <StatusPill key={item} label={item} />
            ))}
            {plan.impact.services.length + plan.impact.apis.length + plan.impact.databaseSchemas.length === 0 ? (
              <p className="text-sm text-steel">No direct system impact inferred yet.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded border border-line bg-white p-5">
        <h2 className="text-lg font-semibold">Risks</h2>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-graphite">
          {plan.risk.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>

      <div className="rounded border border-line bg-white p-5">
        <h2 className="text-lg font-semibold">Execution Plan</h2>
        <ol className="mt-4 space-y-4">
          {plan.steps.map((step) => (
            <li key={step.id} className="border-l-2 border-line pl-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <StatusPill label={step.domain} />
              </div>
              <p className="mt-2 text-sm leading-6 text-graphite">{step.summary}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded border border-line bg-white p-5">
        <h2 className="text-lg font-semibold">Validation Plan</h2>
        <div className="mt-4 space-y-3">
          {plan.validations.map((check) => (
            <div key={check.id} className="flex items-center justify-between gap-3 rounded border border-line p-3">
              <div>
                <p className="text-sm font-semibold">{check.title}</p>
                {check.command ? <p className="mt-1 text-xs text-steel">{check.command}</p> : null}
              </div>
              <StatusPill label={check.status} tone={check.status} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded border border-line bg-white p-5 lg:col-span-2">
        <h2 className="text-lg font-semibold">Affected Files</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {plan.impact.files.map((file) => (
            <div key={file} className="rounded border border-line bg-cloud px-3 py-2 text-sm text-graphite">
              {file}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded border border-line bg-white p-5 lg:col-span-2">
        <h2 className="text-lg font-semibold">Rollback</h2>
        <p className="mt-3 text-sm leading-6 text-graphite">{plan.rollbackStrategy}</p>
      </div>
    </section>
  );
}
