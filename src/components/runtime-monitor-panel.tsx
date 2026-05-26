"use client";

import { useEffect, useState } from "react";
import type { RuntimeEvent } from "@/lib/runtime/runtime-events";

export function RuntimeMonitorPanel({ projectId }: { projectId: string | null }) {
  const [events, setEvents] = useState<RuntimeEvent[]>([]);

  useEffect(() => {
    if (!projectId) return;
    void fetch(`/api/workspace/runtime/events?projectId=${encodeURIComponent(projectId)}`, {
      credentials: "include"
    })
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .catch(() => setEvents([]));
  }, [projectId]);

  if (!projectId) return <p className="text-sm text-steel">Save a project to capture runtime errors.</p>;

  return (
    <div className="space-y-2">
      {events.length === 0 ? (
        <p className="text-sm text-steel">No grouped runtime errors yet. Errors from preview/build will appear here.</p>
      ) : (
        events.map((e) => (
          <div key={e.id} className="rounded-lg border border-line p-3 text-sm">
            <p className="font-medium text-ink">{e.message.slice(0, 200)}</p>
            <p className="text-xs text-steel">×{e.count} · {e.likelyFiles.join(", ") || "no file mapping"}</p>
          </div>
        ))
      )}
    </div>
  );
}
