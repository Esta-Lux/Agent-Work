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

  return (
    <div className="mb-3 rounded-lg border border-line bg-cloud px-3 py-2 text-xs">
      <p className="font-semibold text-signal">Control layer — context gate</p>
      <p className="mt-1 text-ink">
        Confidence: {Math.round(control.contextGate.confidence * 100)}% ·{" "}
        {control.contextGate.status.replace(/_/g, " ")}
        {control.brainRulesCount ? ` · Brain: ${control.brainRulesCount} rules` : ""}
        {control.brainFileHintsCount ? `, ${control.brainFileHintsCount} file hints` : ""}
      </p>
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
      <p className="mt-1 text-[11px] text-steel">{control.scopePreview}</p>
    </div>
  );
}
