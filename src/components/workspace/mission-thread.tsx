"use client";

import type { ReactNode } from "react";

/**
 * Mission Thread — the center column.
 *
 * The thread is not a plain chat: events are typed cards so an operator
 * can scan the mission's history at a glance.
 *
 * Card kinds:
 * - bootrise:     conversational message from BootRise
 * - user:         operator message
 * - architect:    Lead Architect decision (plan, scope contract)
 * - builder:      Builder patch summary
 * - security:     Security blocker / clear
 * - qa:           QA / verification result
 * - deploy:       Deployment / PR result
 * - alert:        Inline contextual alert
 *
 * Renders a header strip with the project mission, the scrollable
 * stream of cards, and a docked input slot at the bottom.
 */

export type MissionEventKind =
  | "bootrise"
  | "user"
  | "architect"
  | "builder"
  | "security"
  | "qa"
  | "deploy"
  | "alert";

export interface MissionEvent {
  id: string;
  kind: MissionEventKind;
  /** ISO timestamp for relative time. Optional. */
  timestamp?: string;
  /** Optional header line in the card. */
  title?: string;
  /** Optional pill label (status). */
  status?: string;
  /** Main body. Can be plain text or a fully composed React node. */
  body: ReactNode;
  /** Tone for cards that carry severity (security/qa/deploy). */
  tone?: "info" | "success" | "warning" | "critical";
  /** Optional footer slot (e.g. inline actions). */
  footer?: ReactNode;
}

const KIND_META: Record<
  MissionEventKind,
  { eyebrow: string; iconBg: string; iconFg: string; glyph: string; bubble: string }
> = {
  bootrise: {
    eyebrow: "BootRise",
    iconBg: "bg-signal/15",
    iconFg: "text-signal",
    glyph: "B",
    bubble: "border-line bg-white"
  },
  user: {
    eyebrow: "You",
    iconBg: "bg-ink",
    iconFg: "text-white",
    glyph: "Y",
    bubble: "border-ink/15 bg-ink/[0.04]"
  },
  architect: {
    eyebrow: "Lead Architect",
    iconBg: "bg-graphite",
    iconFg: "text-white",
    glyph: "LA",
    bubble: "border-line bg-cloud/50"
  },
  builder: {
    eyebrow: "Builder",
    iconBg: "bg-signal",
    iconFg: "text-white",
    glyph: "BD",
    bubble: "border-signal/25 bg-signal/6"
  },
  security: {
    eyebrow: "Security",
    iconBg: "bg-critical/15",
    iconFg: "text-critical",
    glyph: "SE",
    bubble: "border-critical/25 bg-critical/6"
  },
  qa: {
    eyebrow: "QA / Verify",
    iconBg: "bg-caution/15",
    iconFg: "text-caution",
    glyph: "QA",
    bubble: "border-line bg-white"
  },
  deploy: {
    eyebrow: "Deploy / PR",
    iconBg: "bg-ink",
    iconFg: "text-white",
    glyph: "PR",
    bubble: "border-line bg-white"
  },
  alert: {
    eyebrow: "Alert",
    iconBg: "bg-caution/15",
    iconFg: "text-caution",
    glyph: "!",
    bubble: "border-caution/25 bg-caution/6"
  }
};

const TONE_BORDER: Record<NonNullable<MissionEvent["tone"]>, string> = {
  info: "border-line",
  success: "border-signal/30",
  warning: "border-caution/35",
  critical: "border-critical/30"
};

export function MissionThread({
  missionLabel,
  missionDetail,
  events,
  emptyState,
  input,
  headerActions,
  className = "",
  scrollRef
}: {
  missionLabel: string;
  missionDetail?: string;
  events: MissionEvent[];
  emptyState?: ReactNode;
  /** The docked input area (chat composer). */
  input: ReactNode;
  /** Optional buttons in the thread header. */
  headerActions?: ReactNode;
  className?: string;
  scrollRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card ${className}`}
      aria-label="Mission thread"
    >
      <header className="flex items-start justify-between gap-3 border-b border-line bg-white px-5 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-signal">Mission thread</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-ink">{missionLabel}</p>
          {missionDetail ? <p className="mt-0.5 truncate text-xs text-steel">{missionDetail}</p> : null}
        </div>
        {headerActions ? <div className="flex shrink-0 items-center gap-2">{headerActions}</div> : null}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        {events.length === 0 ? (
          <div className="flex h-full items-center justify-center py-12">{emptyState}</div>
        ) : (
          <ol className="space-y-3">
            {events.map((event) => (
              <li key={event.id}>
                <MissionEventCard event={event} />
              </li>
            ))}
          </ol>
        )}
      </div>

      <footer className="border-t border-line bg-cloud/40 px-4 py-3 sm:px-5">{input}</footer>
    </section>
  );
}

function MissionEventCard({ event }: { event: MissionEvent }) {
  const meta = KIND_META[event.kind];
  const toneBorder = event.tone ? TONE_BORDER[event.tone] : "";
  const isUser = event.kind === "user";
  return (
    <article
      className={`flex gap-3 rounded-2xl border p-3 sm:p-4 ${meta.bubble} ${toneBorder}`}
    >
      <span
        aria-hidden
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${meta.iconBg} ${meta.iconFg}`}
      >
        {meta.glyph}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isUser ? "text-ink" : "text-steel"}`}>
            {meta.eyebrow}
          </p>
          {event.status ? (
            <span className="inline-flex items-center rounded-full border border-line bg-white px-2 py-0.5 text-[10px] font-semibold text-graphite">
              {event.status}
            </span>
          ) : null}
          {event.timestamp ? (
            <span className="text-[10px] text-steel">{formatRelative(event.timestamp)}</span>
          ) : null}
        </div>
        {event.title ? <p className="mt-1 text-sm font-semibold text-ink">{event.title}</p> : null}
        <div className="mt-1 text-sm leading-6 text-graphite">{event.body}</div>
        {event.footer ? <div className="mt-3">{event.footer}</div> : null}
      </div>
    </article>
  );
}

function formatRelative(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diffMs = Date.now() - t;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}
