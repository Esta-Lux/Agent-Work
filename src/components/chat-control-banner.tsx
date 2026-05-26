"use client";

import type { ChatControlSummary } from "@/lib/control/types";

export function ChatControlBanner({ control }: { control: ChatControlSummary }) {
  return (
    <div className="mb-3 rounded-lg border border-line bg-cloud px-3 py-2 text-xs">
      <p className="font-semibold text-signal">Chat control layer</p>
      <p className="mt-1 text-ink">
        Context confidence: {Math.round(control.contextGate.confidence * 100)}% ·{" "}
        {control.contextGate.status.replace(/_/g, " ")}
      </p>
      <p className="mt-1 text-graphite">{control.contextPlan.summary}</p>
      <p className="mt-1 text-steel">{control.tokenWaste.message}</p>
      {control.contextGate.questions.length > 0 ? (
        <ul className="mt-2 space-y-1 text-graphite">
          {control.contextGate.questions.map((q) => (
            <li key={q.id}>• {q.question}</li>
          ))}
        </ul>
      ) : null}
      {control.contextPlan.injectedRules.length > 0 ? (
        <p className="mt-1 text-steel">Rules injected: {control.contextPlan.injectedRules.join(", ")}</p>
      ) : null}
      <p className="mt-1 text-[11px] text-steel">{control.scopePreview}</p>
    </div>
  );
}
