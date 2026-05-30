"use client";

import { useState } from "react";
import type { ProductBrain } from "@/lib/product-brain/product-brain-types";
import { CommandButton } from "@/components/ui/command-button";

export function ProductBrainPanel({
  brain,
  busy,
  onSaveCorrection
}: {
  brain: ProductBrain | null;
  busy?: boolean;
  onSaveCorrection?: (input: string) => void;
}) {
  const [correction, setCorrection] = useState("");
  if (!brain) return null;
  return (
    <section className="rounded-lg bg-card-ws p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-text-ws-3">Product Brain</p>
      <p className="mt-2 text-xs text-text-ws-1">{brain.oneLineDescription}</p>
      <BrainList title="Users" items={brain.targetUsers} />
      <BrainList title="Workflows" items={brain.primaryWorkflows} />
      <BrainList title="Policies" items={brain.policies} />
      <BrainList title="Roadmap" items={brain.currentRoadmap.map((item) => `${item.title} (${item.status})`)} />
      <BrainList title="Known risks" items={brain.knownRisks} />
      <BrainList title="Definition of done" items={brain.definitionOfDone} />
      {onSaveCorrection ? (
        <div className="mt-3 space-y-2">
          <textarea
            className="min-h-20 w-full rounded-md border border-border-ws bg-black/20 px-2 py-2 text-xs text-text-ws-1 outline-none"
            value={correction}
            onChange={(event) => setCorrection(event.target.value)}
            placeholder='Correct Product Brain: "That policy is wrong", "Add this business rule", ...'
          />
          <CommandButton
            theme="workspace"
            variant="ghost"
            size="sm"
            label="Save correction"
            loading={busy}
            disabled={!correction.trim()}
            onClick={() => {
              onSaveCorrection(correction.trim());
              setCorrection("");
            }}
          />
        </div>
      ) : null}
    </section>
  );
}

function BrainList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-text-ws-3">{title}</p>
      <ul className="mt-1 space-y-1 text-xs text-text-ws-2">
        {items.slice(0, 5).map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}
