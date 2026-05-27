"use client";

import { useEffect, useRef, useState } from "react";
import { StatusPill } from "@/components/status-pill";

const INTELLIGENCE_TABS = [
  { id: "architecture", label: "Architecture" },
  { id: "brain", label: "Brain" },
  { id: "control", label: "Control" },
  { id: "security", label: "Security" },
  { id: "ledger", label: "Ledger" }
] as const;

export type IntelligenceTabId = (typeof INTELLIGENCE_TABS)[number]["id"];

export function isIntelligenceTab(tab: string): tab is IntelligenceTabId {
  return INTELLIGENCE_TABS.some((t) => t.id === tab);
}

export function WorkspaceIntelligenceMenu({
  activeTab,
  onSelect,
  blockers
}: {
  activeTab: string;
  onSelect: (tab: IntelligenceTabId) => void;
  blockers?: number;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const intelligenceActive = isIntelligenceTab(activeTab);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
          intelligenceActive ? "border-signal/40 bg-signal/10 text-signal" : "border-line bg-white text-graphite hover:bg-cloud"
        }`}
      >
        Intelligence
        <span className="text-steel">{open ? "▴" : "▾"}</span>
        {(blockers ?? 0) > 0 ? <StatusPill label={`${blockers} blocker`} tone="warning" /> : null}
      </button>
      {open ? (
        <ul className="absolute right-0 top-full z-20 mt-2 min-w-[11rem] overflow-hidden rounded-xl border border-line bg-white py-1 shadow-card">
          {INTELLIGENCE_TABS.map((tab) => (
            <li key={tab.id}>
              <button
                type="button"
                className={`w-full cursor-pointer px-4 py-2.5 text-left text-sm font-medium ${
                  activeTab === tab.id ? "bg-cloud text-ink" : "text-graphite hover:bg-cloud/80"
                }`}
                onClick={() => {
                  onSelect(tab.id);
                  setOpen(false);
                }}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
