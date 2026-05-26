"use client";

import type { ProjectMemoryItem } from "@/lib/project-brain/types";
import { Panel } from "@/components/workspace-ui";

export function ProjectDecisionsPanel({ items }: { items: ProjectMemoryItem[] }) {
  const decisions = items.filter((m) => m.type === "decision" && m.status === "active");

  return (
    <Panel title="Decision records">
      {decisions.length === 0 ? (
        <p className="text-sm text-steel">No architecture decisions recorded yet.</p>
      ) : (
        <ul className="space-y-2">
          {decisions.map((d) => (
            <li key={d.id} className="rounded-lg border border-line px-3 py-2 text-sm">
              <p className="font-medium text-ink">{d.title}</p>
              <p className="mt-1 text-graphite">{d.content}</p>
              <p className="mt-1 text-xs text-steel">Source: {d.source}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
