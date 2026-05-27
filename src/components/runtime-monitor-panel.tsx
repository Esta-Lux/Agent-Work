"use client";

import { useCallback, useEffect, useState } from "react";
import type { RuntimeEvent } from "@/lib/runtime/runtime-events";

export function RuntimeMonitorPanel({
  projectId,
  refreshToken = 0,
  onSuggestFix
}: {
  projectId: string | null;
  refreshToken?: number;
  onSuggestFix?: (suggestedRequest: string) => void;
}) {
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/workspace/runtime/events?projectId=${encodeURIComponent(projectId)}`, {
        credentials: "include"
      });
      const data = await res.json();
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

  async function suggestFix(event: RuntimeEvent) {
    if (!projectId || !onSuggestFix) return;
    const res = await fetch("/api/workspace/runtime/suggest", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, eventId: event.id, message: event.message })
    });
    const data = await res.json();
    if (res.ok && data.suggestion?.suggestedRequest) {
      onSuggestFix(data.suggestion.suggestedRequest);
    }
  }

  if (!projectId) {
    return <p className="text-sm text-steel">Import a repo or save a project to capture runtime errors.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase text-steel">Runtime monitor</p>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="text-xs font-semibold text-signal"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-steel">No grouped runtime errors yet. Preview/build failures appear here.</p>
      ) : (
        events.map((e) => (
          <div key={e.id} className="rounded-lg border border-line p-3 text-sm">
            <p className="font-medium text-ink">{e.message.slice(0, 200)}</p>
            <p className="text-xs text-steel">
              ×{e.count} · {e.likelyFiles.join(", ") || "no file mapping"}
            </p>
            {onSuggestFix ? (
              <button
                type="button"
                onClick={() => void suggestFix(e)}
                className="mt-2 text-xs font-semibold text-signal"
              >
                Suggest scoped fix →
              </button>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}
