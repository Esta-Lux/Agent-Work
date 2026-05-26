"use client";

import { useEffect, useState } from "react";
import type { LedgerEvent } from "@/lib/workspace/living-ledger-timeline";

export function WorkspaceLivingLedger({ projectId }: { projectId: string | null }) {
  const [events, setEvents] = useState<LedgerEvent[]>([]);

  useEffect(() => {
    if (!projectId) {
      setEvents([]);
      return;
    }

    void fetch(`/api/workspace/ledger?projectId=${encodeURIComponent(projectId)}`, {
      credentials: "include"
    })
      .then(async (res) => {
        const data = (await res.json()) as { events?: LedgerEvent[] };
        if (res.ok) setEvents(data.events ?? []);
      })
      .catch(() => setEvents([]));
  }, [projectId]);

  if (!projectId) {
    return (
      <p className="text-sm text-steel">
        Save a project to enable the Living Ledger — BootRise records imports, plans, approvals, and verification as
        architectural time travel.
      </p>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-steel">
        No ledger events yet. Import a repo, run Fix, or verify — BootRise will narrate each state transition here.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="rounded-lg border border-line bg-cloud/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-signal">{event.kind}</p>
          <p className="mt-1 font-medium text-ink">{event.title}</p>
          <p className="mt-1 text-sm text-steel">{event.narrative}</p>
          <p className="mt-2 text-xs text-steel">{new Date(event.createdAt).toLocaleString()}</p>
        </li>
      ))}
    </ul>
  );
}
