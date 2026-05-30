"use client";

import { useEffect, useMemo, useState } from "react";
import { ONBOARDING_STEPS, type OnboardingState } from "@/lib/onboarding/onboarding-state";
import { StatusPill } from "@/components/ui/status-pill";

interface OnboardingChecklistProps {
  state: OnboardingState;
  onDismiss: () => void;
  mode?: "bar" | "tour";
}

const tourSteps = [
  {
    selector: "[data-tour='topbar']",
    title: "Your workspace status lives here",
    copy: "Credits, environment, account state, and the current project name stay visible while you work."
  },
  {
    selector: "[data-tour='command-center']",
    title: "One next action at a time",
    copy: "BootRise keeps the workflow focused. This button changes from Connect to Brief, Fix, Verify, and Export as you progress."
  },
  {
    selector: "[data-tour='workflow-rail']",
    title: "Follow the guided build path",
    copy: "The rail shows what is active, what is done, and what stays locked until real code is connected."
  },
  {
    selector: "[data-tour='file-workspace']",
    title: "Work against real files",
    copy: "After import, the file tree and editor appear here. Manual edits and AI patches both flow through safety checks."
  },
  {
    selector: "[data-tour='context-inspector']",
    title: "Control the current step",
    copy: "The right panel changes with the step: repo import, brief, fix request, verification, security, deployment, and PR composer."
  },
  {
    selector: "[data-tour='provider-duel']",
    title: "Compare providers before patching",
    copy: "In the Fix step, Provider Duel compares available AI providers without mutating files."
  },
  {
    selector: "[data-tour='security-deploy']",
    title: "Verify, scan, then ship",
    copy: "Security Center and deployment readiness appear during Verify, then feed the export and draft PR preflight."
  }
];

export function OnboardingChecklist({ state, onDismiss, mode = "bar" }: OnboardingChecklistProps) {
  const completed = new Set(state.completedSteps);
  const progress = Math.round((completed.size / ONBOARDING_STEPS.length) * 100);
  const [activeIndex, setActiveIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const active = tourSteps[activeIndex];

  useEffect(() => {
    if (mode !== "tour") return;
    function updateTarget() {
      const element = document.querySelector(active.selector);
      setTargetRect(element?.getBoundingClientRect() ?? null);
      element?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
    }
    updateTarget();
    window.addEventListener("resize", updateTarget);
    window.addEventListener("scroll", updateTarget, true);
    return () => {
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener("scroll", updateTarget, true);
    };
  }, [active.selector, mode]);

  const spotlightStyle = useMemo(() => {
    if (!targetRect) return undefined;
    const pad = 10;
    return {
      top: Math.max(8, targetRect.top - pad),
      left: Math.max(8, targetRect.left - pad),
      width: targetRect.width + pad * 2,
      height: targetRect.height + pad * 2
    };
  }, [targetRect]);

  if (state.dismissed) return null;

  if (mode === "tour") {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[1px]" role="dialog" aria-modal="true" aria-label="BootRise guided tour">
        {spotlightStyle ? (
          <div
            className="pointer-events-none fixed rounded-xl border border-signal/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.72),0_0_40px_rgba(31,217,157,0.35)]"
            style={spotlightStyle}
          />
        ) : null}
        <div className="fixed bottom-6 left-1/2 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 rounded-xl border border-border-ws-2 bg-panel-ws p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-signal-text">BootRise tour</p>
              <h2 className="mt-1 text-lg font-semibold text-text-ws-1">{active.title}</h2>
              <p className="mt-2 text-sm leading-6 text-text-ws-2">{active.copy}</p>
            </div>
            <StatusPill variant="blue" label={`${activeIndex + 1}/${tourSteps.length}`} />
          </div>
          <Checklist progress={progress} completed={completed} compact />
          <div className="mt-4 flex items-center justify-between gap-3">
            <button type="button" className="text-sm text-text-ws-3 hover:text-text-ws-1" onClick={onDismiss}>
              Skip tour
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="h-9 rounded-lg border border-border-ws-2 px-3 text-sm text-text-ws-2 disabled:opacity-40"
                disabled={activeIndex === 0}
                onClick={() => setActiveIndex((value) => Math.max(0, value - 1))}
              >
                Back
              </button>
              <button
                type="button"
                className="h-9 rounded-lg bg-signal px-4 text-sm font-semibold text-white"
                onClick={() => {
                  if (activeIndex === tourSteps.length - 1) onDismiss();
                  else setActiveIndex((value) => Math.min(tourSteps.length - 1, value + 1));
                }}
              >
                {activeIndex === tourSteps.length - 1 ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="border-b border-border-ws bg-panel-ws px-5 py-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-text-ws-3">First-run checklist</p>
            <StatusPill variant={progress === 100 ? "signal" : "blue"} label={`${progress}%`} />
          </div>
          <Checklist progress={progress} completed={completed} currentStep={state.currentStep} />
        </div>
        <button type="button" className="text-xs text-text-ws-3 hover:text-text-ws-1" onClick={onDismiss}>
          Resume later
        </button>
      </div>
    </section>
  );
}

function Checklist({
  completed,
  currentStep,
  compact
}: {
  progress: number;
  completed: Set<string>;
  currentStep?: string;
  compact?: boolean;
}) {
  return (
    <div className={`mt-2 flex flex-wrap gap-2 ${compact ? "max-h-20 overflow-hidden" : ""}`}>
      {ONBOARDING_STEPS.map((step) => {
        const done = completed.has(step.id);
        const active = currentStep === step.id;
        return (
          <span
            key={step.id}
            className={`rounded-full border px-2.5 py-1 text-xs ${done ? "border-signal/30 bg-signal-glow text-signal-text" : active ? "border-blue-500/30 bg-blue-500/10 text-blue-300" : "border-border-ws text-text-ws-3"}`}
          >
            {step.label}
          </span>
        );
      })}
    </div>
  );
}
