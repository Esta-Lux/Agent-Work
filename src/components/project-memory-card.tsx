"use client";

import { useState } from "react";
import type { ProjectMemoryItem } from "@/lib/project-brain/types";

export function ProjectMemoryCard({
  item,
  onCorrect
}: {
  item: ProjectMemoryItem;
  onCorrect?: (id: string, newValue: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.content);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!onCorrect) return;
    setSaving(true);
    try {
      await onCorrect(item.id, draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="rounded-lg border border-line bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase text-signal">{item.type}</p>
          <p className="font-medium text-ink">{item.title}</p>
        </div>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            item.status === "stale" ? "bg-amber-100 text-amber-800" : "bg-cloud text-steel"
          }`}
        >
          {item.status}
        </span>
      </div>
      {editing ? (
        <textarea
          className="mt-2 w-full rounded border border-line p-2 text-sm"
          rows={4}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      ) : (
        <p className="mt-2 text-sm text-steel">{item.content}</p>
      )}
      <p className="mt-2 text-xs text-steel">
        Source: {item.source} · confidence {(item.confidence * 100).toFixed(0)}%
      </p>
      {onCorrect ? (
        <div className="mt-2 flex gap-2">
          {editing ? (
            <>
              <button
                type="button"
                disabled={saving}
                className="rounded bg-signal px-3 py-1 text-xs font-semibold text-white"
                onClick={() => void save()}
              >
                Save correction
              </button>
              <button type="button" className="text-xs text-steel" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="text-xs font-semibold text-signal" onClick={() => setEditing(true)}>
              Correct memory
            </button>
          )}
        </div>
      ) : null}
    </li>
  );
}
