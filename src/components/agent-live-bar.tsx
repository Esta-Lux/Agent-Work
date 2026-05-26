"use client";

import { StatusPill } from "@/components/status-pill";
import type { ThinkingStep } from "@/lib/workspace/workspace-types";

export function AgentLiveBar({
  busy,
  status,
  steps,
  filesInFocus,
  activeFile,
  totalFiles
}: {
  busy: boolean;
  status: string;
  steps: ThinkingStep[];
  filesInFocus: string[];
  activeFile: string | null;
  totalFiles: number;
}) {
  if (!busy && filesInFocus.length === 0 && steps.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-white/80 px-3 py-2 text-xs text-steel">
        {totalFiles > 0
          ? `${totalFiles} files loaded. Ask a question or run Fix — live file focus appears here while BootRise works.`
          : "Import a repo in the right panel to start."}
      </div>
    );
  }

  const activeStep = steps.find((s) => s.status === "active");

  return (
    <div className="rounded-lg border border-signal/30 bg-gradient-to-r from-signal/10 via-white to-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-signal">Agent activity (live)</p>
        <div className="flex flex-wrap gap-1.5">
          {busy ? <StatusPill label={status} tone="neutral" /> : null}
          {totalFiles > 0 ? <StatusPill label={`${totalFiles} files in workspace`} tone="neutral" /> : null}
        </div>
      </div>

      {activeStep ? (
        <p className="mt-2 text-sm font-medium text-ink">
          {activeStep.label}
          {activeStep.detail ? <span className="font-normal text-graphite"> — {activeStep.detail}</span> : null}
        </p>
      ) : null}

      {activeFile ? (
        <p className="mt-1 truncate font-mono text-xs text-signal">
          Reading: <span className="text-ink">{activeFile}</span>
        </p>
      ) : null}

      {filesInFocus.length > 0 ? (
        <div className="mt-2">
          <p className="text-[10px] font-semibold uppercase text-steel">
            Files in this pass ({filesInFocus.length})
          </p>
          <ul className="mt-1 max-h-24 overflow-y-auto rounded border border-line/60 bg-white/90 p-2">
            {filesInFocus.map((path) => (
              <li
                key={path}
                className={`truncate font-mono text-[11px] leading-5 ${
                  path === activeFile ? "font-semibold text-signal" : "text-graphite"
                }`}
              >
                {path === activeFile ? "▸ " : "  "}
                {path}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {steps.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {steps.map((step) => (
            <li
              key={step.id}
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                step.status === "active"
                  ? "bg-signal text-white"
                  : step.status === "done"
                    ? "bg-cloud text-graphite"
                    : "bg-white text-steel"
              }`}
            >
              {step.status === "done" ? "✓ " : step.status === "active" ? "… " : ""}
              {step.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
