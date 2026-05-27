"use client";

import type { ChatControlSummary } from "@/lib/control/types";

export function ChatControlBanner({
  control,
  onProceedWithAssumptions
}: {
  control: ChatControlSummary;
  onProceedWithAssumptions?: () => void;
}) {
  const needsClarification = control.contextGate.status === "needs_clarification";
  const confidence = Math.round(control.contextGate.confidence * 100);

  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-line bg-white text-xs shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-cloud/70 px-3 py-2">
        <div>
          <p className="font-semibold text-signal">Control layer — context gate</p>
          <p className="mt-0.5 text-steel">BootRise is selecting context, rules, and edit scope before spending model tokens.</p>
        </div>
        <div className="rounded-full bg-ink px-3 py-1 font-semibold text-white">{confidence}% confidence</div>
      </div>
      <div className="px-3 py-2">
      <p className="text-ink">
        Status: <span className="font-semibold">{control.contextGate.status.replace(/_/g, " ")}</span>
        {control.brainRulesCount ? ` · Brain: ${control.brainRulesCount} rules` : ""}
        {control.brainFileHintsCount ? ` · ${control.brainFileHintsCount} file hints` : ""}
      </p>
      {control.taskIntent ? (
        <p className="mt-1 text-ink">
          {control.taskIntent.summary}
          {control.taskIntent.seniorArchitectMode ? " · Senior architect framing" : ""}
          {control.taskIntent.suggestedMode !== "fast" ? ` · Suggested mode: ${control.taskIntent.suggestedMode}` : ""}
        </p>
      ) : null}
      <p className="mt-1 text-graphite">{control.contextPlan.summary}</p>
      <p className="mt-1 text-steel">{control.tokenWaste.message}</p>
      {control.contextGate.questions.length > 0 ? (
        <ul className="mt-2 space-y-1 text-graphite">
          {control.contextGate.questions.map((q) => (
            <li key={q.id}>
              <span className="font-medium text-ink">• {q.question}</span>
              <span className="block text-[10px] text-steel">{q.whyItMatters}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {needsClarification && onProceedWithAssumptions ? (
        <button
          type="button"
          onClick={onProceedWithAssumptions}
          className="mt-2 w-full rounded-lg border border-signal/30 bg-signal/10 px-3 py-2 text-xs font-semibold text-signal transition hover:bg-signal/15"
        >
          Proceed with assumptions (scope lock still applies)
        </button>
      ) : null}
      {control.contextPlan.injectedRules.length > 0 ? (
        <p className="mt-1 text-steel">Rules injected: {control.contextPlan.injectedRules.join(", ")}</p>
      ) : null}
      <p className="mt-1 rounded-lg bg-cloud/70 px-2 py-1 text-[11px] text-steel">{control.scopePreview}</p>
      </div>
    </div>
  );
}
