"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AgentActivityRow } from "@/components/workspace/agent-activity-row";
import type { AgentActivityEvent } from "@/lib/agent-activity/agent-activity-types";

export function AgentActivityTimeline({
  projectId,
  refreshToken = 0,
  busy = false
}: {
  projectId: string | null;
  refreshToken?: number;
  busy?: boolean;
}) {
  const [events, setEvents] = useState<AgentActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) {
      setEvents([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/workspace/agent-activity?projectId=${encodeURIComponent(projectId)}`, {
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
    if (!projectId || !busy) return;
    const timer = window.setInterval(() => {
      void load();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [busy, load, projectId]);

  const runningEvent = useMemo(() => events.find((event) => event.status === "running"), [events]);

  return (
    <div className="rounded-lg bg-card-ws p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-text-ws-1">Agent Activity Timeline</p>
          <p className="mt-1 text-[11px] text-text-ws-2">
            {!projectId
              ? "Import a repository to start activity tracking."
              : runningEvent
                ? `Running now: ${runningEvent.title}`
                : "Waiting for the next action."}
          </p>
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
        <p className="mt-3 text-xs leading-5 text-text-ws-2">
          Timeline entries appear after import, planning, fixing, verification, security, and PR actions.
        </p>
      ) : events.length === 0 ? (
        <p className="mt-3 text-xs leading-5 text-text-ws-2">
          No activity yet. Start by importing a repository to generate your first events.
        </p>
      ) : (
        <ol className="mt-3 space-y-2">
          {events.map((event) => (
            <AgentActivityRow key={event.id} event={event} />
          ))}
        </ol>
      )}
    </div>
  );
}
