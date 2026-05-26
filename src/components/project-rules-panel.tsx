"use client";

import type { ProjectMemoryItem } from "@/lib/project-brain/types";
import { Panel } from "@/components/workspace-ui";

export function ProjectRulesPanel({ items }: { items: ProjectMemoryItem[] }) {
  const rules = items.filter((m) => m.type === "rule" && m.status === "active");

  return (
    <Panel title="Known rules">
      {rules.length === 0 ? (
        <p className="text-sm text-steel">No project rules learned yet. Import a repo and run fixes to build memory.</p>
      ) : (
        <ul className="space-y-2">
          {rules.map((r) => (
            <li key={r.id} className="rounded-lg border border-line bg-cloud/50 px-3 py-2 text-sm">
              <p className="font-medium text-ink">{r.title}</p>
              <p className="mt-1 text-steel">{r.content}</p>
              <p className="mt-1 text-xs text-steel">Confidence {(r.confidence * 100).toFixed(0)}%</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
