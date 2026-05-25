"use client";

import type { FileActivity, ThinkingStep } from "@/lib/workspace/workspace-types";

export interface WorkspaceChatMessageProps {
  role: "user" | "assistant";
  content: string;
  phase?: string;
  thinkingSteps?: ThinkingStep[];
  fileActivity?: FileActivity[];
  suggestedActions?: string[];
  plainEnglishSummary?: string;
  onAction?: (action: string) => void;
}

export function WorkspaceChatMessage({
  role,
  content,
  phase,
  thinkingSteps,
  fileActivity,
  suggestedActions,
  plainEnglishSummary,
  onAction
}: WorkspaceChatMessageProps) {
  return (
    <div
      className={`rounded p-3 text-sm leading-6 ${
        role === "user" ? "bg-cloud text-ink" : "border border-line bg-white text-graphite"
      }`}
    >
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase text-steel">{role}</p>
        {phase && role === "assistant" ? (
          <span className="rounded bg-cloud px-2 py-0.5 text-[10px] font-semibold uppercase text-signal">{phase}</span>
        ) : null}
      </div>

      {thinkingSteps && thinkingSteps.length > 0 ? <ThinkingPanel steps={thinkingSteps} /> : null}
      {fileActivity && fileActivity.length > 0 && fileActivity.length <= 8 ? (
        <FileActivityPanel items={fileActivity} compact />
      ) : null}

      <div className="mt-2 whitespace-pre-wrap font-sans">{content}</div>

      {plainEnglishSummary ? (
        <div className="mt-3 rounded-lg border border-signal/20 bg-signal/5 p-3">
          <p className="text-xs font-semibold uppercase text-signal">In plain English</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-graphite">{plainEnglishSummary}</p>
        </div>
      ) : null}

      {suggestedActions && suggestedActions.length > 0 && role === "assistant" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestedActions.map((action) => (
            <button
              key={action}
              type="button"
              className="cursor-pointer rounded border border-line bg-cloud px-2.5 py-1 text-xs font-semibold text-graphite hover:bg-white"
              onClick={() => onAction?.(action)}
            >
              {action}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ThinkingPanel({ steps }: { steps: ThinkingStep[] }) {
  return (
    <ul className="mt-2 space-y-1 rounded border border-line bg-cloud p-2">
      {steps.map((step) => (
        <li key={step.id} className="flex items-start gap-2 text-xs text-graphite">
          <span className="mt-0.5 font-mono text-steel">
            {step.status === "done" ? "✓" : step.status === "active" ? "…" : "○"}
          </span>
          <span>
            <span className="font-semibold text-ink">{step.label}</span>
            {step.detail ? <span className="text-steel"> — {step.detail}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function FileActivityPanel({ items, compact }: { items: FileActivity[]; compact?: boolean }) {
  return (
    <ul className={`space-y-1 ${compact ? "mt-2" : "mt-3"}`}>
      {items.map((item) => (
        <li key={item.path} className="rounded border border-line bg-cloud px-2 py-1.5 text-xs">
          <span className="font-semibold text-ink">{item.path}</span>
          <span className="text-steel"> · {item.status}</span>
          <p className="text-graphite">{item.detail}</p>
        </li>
      ))}
    </ul>
  );
}
