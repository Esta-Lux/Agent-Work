"use client";

import { useState } from "react";
import type { AgentActivityEvent } from "@/lib/agent-activity/agent-activity-types";

const actorLabel: Record<AgentActivityEvent["actor"], string> = {
  architect_agent: "Architect",
  project_brain_agent: "Project Brain",
  product_brain_agent: "Product Brain",
  context_agent: "Context",
  builder_agent: "Builder",
  security_agent: "Security",
  qa_agent: "QA",
  deployment_agent: "Deployment",
  self_agent: "Self",
  system: "System"
};

export function AgentActivityRow({ event }: { event: AgentActivityEvent }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = Boolean(
    event.detail || event.command || event.outputPreview || event.filePaths?.length || event.metadata
  );

  return (
    <li className="rounded-md bg-black/20 p-2">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-xs" aria-hidden="true">
          {statusIcon(event.status)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-text-ws-1">{event.title}</p>
              <p className="mt-0.5 text-[11px] text-text-ws-2">
                {formatTimestamp(event.createdAt)} · {actorLabel[event.actor]} · {event.status}
              </p>
            </div>
            {hasDetails ? (
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-signal hover:text-signal/80"
              >
                {expanded ? "Hide" : "Details"}
              </button>
            ) : null}
          </div>
          {event.detail ? <p className="mt-1 text-[11px] leading-5 text-text-ws-2">{event.detail}</p> : null}
          {expanded ? (
            <div className="mt-2 space-y-1 text-[11px] leading-5 text-text-ws-2">
              {event.command ? (
                <p>
                  <span className="font-semibold text-text-ws-1">Command:</span> {event.command}
                </p>
              ) : null}
              {typeof event.exitCode === "number" ? (
                <p>
                  <span className="font-semibold text-text-ws-1">Exit code:</span> {event.exitCode}
                </p>
              ) : null}
              {typeof event.durationMs === "number" ? (
                <p>
                  <span className="font-semibold text-text-ws-1">Duration:</span> {formatDuration(event.durationMs)}
                </p>
              ) : null}
              {event.filePaths?.length ? (
                <div>
                  <p className="font-semibold text-text-ws-1">Files</p>
                  <ul className="mt-1 space-y-0.5 font-mono text-[10px]">
                    {event.filePaths.map((path) => (
                      <li key={path}>{path}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {event.outputPreview ? (
                <div>
                  <p className="font-semibold text-text-ws-1">Output</p>
                  <pre className="mt-1 overflow-x-auto rounded bg-black/30 p-2 font-mono text-[10px] text-text-ws-2">
                    {event.outputPreview}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function statusIcon(status: AgentActivityEvent["status"]) {
  switch (status) {
    case "success":
      return "✓";
    case "warning":
      return "⚠";
    case "failed":
      return "✕";
    case "running":
      return "●";
    default:
      return "○";
  }
}

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDuration(durationMs: number) {
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}
