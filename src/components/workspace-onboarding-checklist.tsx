"use client";

import { Button } from "@/components/ui/button";
import { PanelShell } from "@/components/ui/panel-shell";

export type OnboardingStepId = "connect" | "brief" | "fix" | "verify" | "export";

export interface OnboardingStep {
  id: OnboardingStepId;
  label: string;
  detail: string;
  done: boolean;
}

const STORAGE_KEY = "bootrise_onboarding_dismissed";

export function readOnboardingDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function dismissOnboardingChecklist() {
  window.localStorage.setItem(STORAGE_KEY, "1");
}

export function WorkspaceOnboardingChecklist({
  steps,
  onGo,
  onDismiss
}: {
  steps: OnboardingStep[];
  onGo: (id: OnboardingStepId) => void;
  onDismiss: () => void;
}) {
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const progress = Math.round((doneCount / steps.length) * 100);

  return (
    <PanelShell
      eyebrow="Getting started"
      title="Ship your first safe change"
      description="Follow the control-layer workflow — each step unlocks the next."
      action={
        <button type="button" className="cursor-pointer text-xs font-semibold text-steel hover:text-ink" onClick={onDismiss}>
          Dismiss
        </button>
      }
      className="mb-6"
    >
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-cloud">
        <div className="h-full rounded-full bg-signal transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={`flex items-start gap-3 rounded-xl border px-3 py-3 transition ${
              step.done ? "border-signal/25 bg-signal/5" : "border-line bg-white"
            }`}
          >
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step.done ? "bg-signal text-white" : "bg-cloud text-steel"
              }`}
            >
              {step.done ? "✓" : index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{step.label}</p>
              <p className="mt-0.5 text-xs leading-5 text-steel">{step.detail}</p>
            </div>
            {!step.done ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => onGo(step.id)}>
                Go
              </Button>
            ) : null}
          </li>
        ))}
      </ol>
      {allDone ? (
        <p className="mt-4 text-sm font-medium text-signal">All set — you can export or open a draft PR when ready.</p>
      ) : (
        <p className="mt-3 text-xs text-steel">
          {doneCount} of {steps.length} complete · use the journey bar below to jump between steps
        </p>
      )}
    </PanelShell>
  );
}
