"use client";

import { BOOTRISE_PERSONAS } from "@/lib/ai/personas";
import type { BootrisePersonaId } from "@/lib/ai/bootrise-voice";

export function PersonaSelector({
  value,
  onChange
}: {
  value: BootrisePersonaId;
  onChange: (persona: BootrisePersonaId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-white p-1">
      {BOOTRISE_PERSONAS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          className={`cursor-pointer rounded-md px-3 py-2 text-left transition ${
            value === p.id ? "bg-ink text-white" : "text-graphite hover:bg-cloud"
          }`}
        >
          <span className="block text-xs font-semibold">{p.label}</span>
          <span className={`block text-[10px] ${value === p.id ? "text-white/75" : "text-steel"}`}>{p.hint}</span>
        </button>
      ))}
    </div>
  );
}
