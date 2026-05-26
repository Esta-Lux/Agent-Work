"use client";

import { extractPlainEnglishSection, formatUserFacingMessage, parseStructuredMessage, stripMarkdownForUser } from "@/lib/format-user-message";
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
  const parsed = parseStructuredMessage(content);
  const sections = parsed.sections.filter((s) => !s.title.toLowerCase().includes("plain english"));
  const displayPlain =
    plainEnglishSummary ?? parsed.plainEnglish ?? extractPlainEnglishSection(content);
  const mainContent =
    sections.length > 0
      ? null
      : stripMarkdownForUser(parsed.bodyWithoutSections || formatUserFacingMessage(content));

  return (
    <div
      className={`rounded-xl text-sm leading-6 ${
        role === "user"
          ? "ml-8 bg-ink px-4 py-3 text-white"
          : "mr-4 border border-line bg-white px-4 py-3 text-graphite shadow-sm"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className={`text-xs font-semibold uppercase ${role === "user" ? "text-white/70" : "text-steel"}`}>
          {role === "user" ? "You" : "BootRise"}
        </p>
        {phase && role === "assistant" ? (
          <span className="rounded-full bg-cloud px-2 py-0.5 text-[10px] font-semibold uppercase text-signal">
            {phase}
          </span>
        ) : null}
      </div>

      {thinkingSteps && thinkingSteps.length > 0 ? <ThinkingPanel steps={thinkingSteps} /> : null}

      {sections.length > 0 ? (
        <div className="space-y-3">
          {sections.map((section) => (
            <section key={section.title} className="rounded-lg border border-line/80 bg-cloud/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-signal">{section.title}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-graphite">
                {stripMarkdownForUser(section.content)}
              </p>
            </section>
          ))}
        </div>
      ) : mainContent ? (
        <div className="mt-1 whitespace-pre-wrap font-sans">{mainContent}</div>
      ) : null}

      {fileActivity && fileActivity.length > 0 ? <FileActivityPanel items={fileActivity} /> : null}

      {displayPlain && role === "assistant" ? (
        <div className="mt-3 rounded-lg border border-signal/25 bg-signal/5 p-3">
          <p className="text-xs font-semibold uppercase text-signal">Summary</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-graphite">{stripMarkdownForUser(displayPlain)}</p>
        </div>
      ) : null}

      {suggestedActions && suggestedActions.length > 0 && role === "assistant" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestedActions.map((action) => (
            <button
              key={action}
              type="button"
              className="cursor-pointer rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm hover:border-signal/40 hover:bg-cloud"
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
    <ul className="mb-3 space-y-1 rounded-lg border border-line bg-cloud/60 p-2">
      {steps.map((step) => (
        <li key={step.id} className="flex items-start gap-2 text-xs text-graphite">
          <span className="mt-0.5 font-mono text-steel">
            {step.status === "done" ? "✓" : step.status === "active" ? "…" : "○"}
          </span>
          <span>
            <span className="font-semibold text-ink">{step.label}</span>
            {step.detail ? <span className="text-steel"> — {stripMarkdownForUser(step.detail)}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function FileActivityPanel({ items }: { items: FileActivity[] }) {
  const show = items.slice(0, 16);
  const more = items.length - show.length;
  return (
    <details className="mt-3 rounded-lg border border-line bg-cloud/50 p-2">
      <summary className="cursor-pointer text-xs font-semibold text-ink">
        Files touched in this reply ({items.length})
      </summary>
      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
        {show.map((item) => (
          <li key={item.path} className="rounded bg-white px-2 py-1 text-[11px]">
            <span className="font-mono text-ink">{item.path}</span>
            <span className="text-steel"> · {item.status}</span>
          </li>
        ))}
        {more > 0 ? <li className="text-[11px] text-steel">+{more} more</li> : null}
      </ul>
    </details>
  );
}
