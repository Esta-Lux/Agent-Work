"use client";

import { StatusPill } from "@/components/ui/status-pill";
import type { MultiPassExecutionResult } from "@/lib/workspace/work-unit-state";
import type { WorkUnitPlan } from "@/lib/workspace/work-unit-planner";

export function WorkUnitExecutionPanel({
  plan,
  execution,
  busy,
  onRerunUnit
}: {
  plan: WorkUnitPlan | null;
  execution: MultiPassExecutionResult | null;
  busy?: boolean;
  onRerunUnit?: (workUnitId: string) => void;
}) {
  if (!plan?.requiresMultiPass) return null;

  const byId = new Map(execution?.executions.map((item) => [item.workUnitId, item]));

  return (
    <div className="rounded-lg bg-card-ws p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-text-ws-1">Work unit execution</p>
        <StatusPill variant={execution?.status === "blocked" ? "red" : execution?.status === "completed" ? "signal" : "amber"} label={busy ? "running" : execution?.status ?? "planned"} />
      </div>
      <ol className="mt-3 space-y-2">
        {plan.units.map((unit, index) => {
          const run = byId.get(unit.id);
          return (
            <li key={unit.id} className="rounded-md bg-black/20 p-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-text-ws-1">
                  {index + 1}. {unit.title}
                </p>
                <StatusPill variant={run?.status === "blocked" ? "red" : run?.status === "patched" || run?.status === "passed" ? "signal" : run ? "amber" : "blue"} label={run?.status ?? "planned"} />
              </div>
              <p className="mt-1 truncate font-mono text-[11px] text-text-ws-2" title={unit.targetFiles.join(", ")}>
                {unit.targetFiles.join(", ")}
              </p>
              {run?.blockers?.[0] ? <p className="mt-1 text-[11px] text-red-300">{run.blockers[0]}</p> : null}
              {onRerunUnit && run && (run.status === "blocked" || run.status === "skipped") ? (
                <button
                  type="button"
                  className="mt-2 text-[11px] font-semibold text-signal hover:text-signal/80 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={busy}
                  onClick={() => onRerunUnit(unit.id)}
                >
                  Re-run unit
                </button>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
