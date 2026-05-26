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

    const orgHeader = process.env.NEXT_PUBLIC_BOOTRISE_ORG_ID?.trim() || "org_default";
    void fetch(`/api/workspace/ledger?projectId=${encodeURIComponent(projectId)}`, {
      headers: { "x-bootrise-org-id": orgHeader }
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
    <ol className="relative space-y-4 border-l border-line pl-4">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-signal" />
          <p className="text-[10px] font-semibold uppercase text-steel">
            {event.kind.replace(/_/g, " ")} · {new Date(event.createdAt).toLocaleString()}
          </p>
          <p className="text-sm font-semibold text-ink">{event.title}</p>
          <p className="mt-1 text-sm leading-6 text-graphite">{event.narrative}</p>
        </li>
      ))}
    </ol>
  );
}
