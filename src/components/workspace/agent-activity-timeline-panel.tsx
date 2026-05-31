"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AgentActivityEvent } from "@/lib/workspace/agent-activity";

export function AgentActivityTimelinePanel({
  projectId,
  refreshToken = 0
}: {
  projectId: string | null;
  refreshToken?: number;
}) {
  const [events, setEvents] = useState<AgentActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) {
      setEvents([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/workspace/activity/events?projectId=${encodeURIComponent(projectId)}`, {
        credentials: "include"
      });
      const data = (await res.json().catch(() => ({}))) as { events?: AgentActivityEvent[] };
      setEvents(data.events ?? []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  useEffect(() => {
    if (!projectId) return;
    const intervalId = window.setInterval(() => {
      void load();
    }, 4000);
    return () => window.clearInterval(intervalId);
  }, [load, projectId]);

  const headline = useMemo(() => {
    if (!events.length) return "No activity yet";
    return events[0]?.status === "failed" ? "Needs attention" : "BootRise is working";
  }, [events]);

  return (
    <div className="rounded-lg bg-card-ws p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-text-ws-1">BootRise Worklog</p>
          <p className="mt-1 text-[11px] text-text-ws-2">{projectId ? headline : "Import a repo to start capturing activity."}</p>
        </div>
        {projectId ? (
          <button
            type="button"
            onClick={() => void load()}
            className="text-[11px] font-semibold text-signal hover:text-signal/80"
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        ) : null}
      </div>

      {!projectId ? (
        <p className="mt-3 text-xs leading-5 text-text-ws-2">Repository import, indexing, security scans, diff generation, and PR prep events appear here.</p>
      ) : events.length === 0 ? (
        <p className="mt-3 text-xs leading-5 text-text-ws-2">BootRise will stream real job and workspace events here as it works through the task.</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {events.map((event) => {
            const expanded = expandedId === event.id;
            const hasDetails = Boolean(event.detail || event.command || event.outputPreview || event.filePaths?.length || event.metadata);
            return (
              <li key={event.id} className="rounded-md bg-black/20 p-2">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-xs" aria-hidden="true">
                    {statusIcon(event.status)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-text-ws-1">{event.title}</p>
                        <p className="mt-0.5 text-[11px] text-text-ws-2">
                          {formatTimestamp(event.timestamp)}
                          {event.detail ? ` · ${event.detail}` : ""}
                        </p>
                      </div>
                      {hasDetails ? (
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : event.id)}
                          className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-signal hover:text-signal/80"
                        >
                          {expanded ? "Hide" : "Details"}
                        </button>
                      ) : null}
                    </div>
                    {expanded ? (
                      <div className="mt-2 space-y-1 text-[11px] leading-5 text-text-ws-2">
                        {event.command ? <p><span className="font-semibold text-text-ws-1">Command:</span> {event.command}</p> : null}
                        {typeof event.exitCode === "number" ? <p><span className="font-semibold text-text-ws-1">Exit code:</span> {event.exitCode}</p> : null}
                        {typeof event.durationMs === "number" ? <p><span className="font-semibold text-text-ws-1">Duration:</span> {formatDuration(event.durationMs)}</p> : null}
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
                            <pre className="mt-1 overflow-x-auto rounded bg-black/30 p-2 font-mono text-[10px] text-text-ws-2">{event.outputPreview}</pre>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
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
