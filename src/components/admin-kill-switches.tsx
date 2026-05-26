"use client";

import { useEffect, useState } from "react";
import { StatusPill } from "@/components/status-pill";

interface KillSwitchState {
  disableNvidia: boolean;
  disableOpenAI: boolean;
  disableClaude: boolean;
  disableCodex: boolean;
  disableFixExecution: boolean;
  disableSandbox: boolean;
  disableExpensiveModels: boolean;
  disablePremiumEscalation: boolean;
  disableGithubImport: boolean;
  disableGithubPush: boolean;
  disableDraftPrCreation: boolean;
  disableAdminChat: boolean;
  maxWorkspaceFiles: number;
  updatedAt: string;
}

export function AdminKillSwitches() {
  const [state, setState] = useState<KillSwitchState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const res = await fetch("/api/admin/kill-switches");
    const data = (await res.json()) as { switches?: KillSwitchState };
    if (res.ok) setState(data.switches ?? null);
  }

  async function save(patch: Partial<KillSwitchState>) {
    if (!state) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/kill-switches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...state, ...patch })
      });
      const data = (await res.json()) as { switches?: KillSwitchState; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setState(data.switches ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!state) return <p className="text-sm text-steel">Loading kill switches…</p>;

  const toggles: Array<{ key: keyof KillSwitchState; label: string; hint: string }> = [
    { key: "disableNvidia", label: "Disable BootRise AI", hint: "Blocks NVIDIA-backed default model calls" },
    { key: "disableOpenAI", label: "Disable OpenAI", hint: "Blocks ChatGPT / GPT premium calls" },
    { key: "disableClaude", label: "Disable Claude", hint: "Keeps planned Claude adapter blocked" },
    { key: "disableCodex", label: "Disable Codex", hint: "Keeps planned Codex adapter blocked" },
    { key: "disableFixExecution", label: "Disable fix pipeline", hint: "Blocks POST /api/workspace/fix" },
    { key: "disableSandbox", label: "Disable sandbox", hint: "Blocks npm/python verify" },
    { key: "disableExpensiveModels", label: "Disable LLM calls", hint: "Blocks chat + patch LLM" },
    { key: "disablePremiumEscalation", label: "Disable premium escalation", hint: "Blocks OpenAI/Claude/Codex escalation" },
    { key: "disableGithubImport", label: "Disable GitHub import", hint: "Blocks repo import from GitHub" },
    { key: "disableGithubPush", label: "Disable GitHub push", hint: "Blocks automated branch push" },
    { key: "disableDraftPrCreation", label: "Disable draft PRs", hint: "Blocks automated draft PR creation" },
    { key: "disableAdminChat", label: "Disable admin chat", hint: "Blocks admin AI chat responses" }
  ];

  return (
    <div className="rounded border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">Kill switches</p>
        <StatusPill label="Phase 3 ops" tone="neutral" />
      </div>
      <p className="mt-2 text-xs leading-5 text-graphite">
        BootRise operators can stop expensive or risky actions platform-wide. Changes are audited and persisted locally.
      </p>
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
      <ul className="mt-4 space-y-3">
        {toggles.map((t) => (
          <li key={t.key} className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">{t.label}</p>
              <p className="text-xs text-steel">{t.hint}</p>
            </div>
            <button
              type="button"
              disabled={busy}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold ${
                state[t.key] ? "bg-critical/15 text-critical" : "bg-cloud text-graphite"
              }`}
              onClick={() => void save({ [t.key]: !state[t.key] })}
            >
              {state[t.key] ? "ON" : "OFF"}
            </button>
          </li>
        ))}
      </ul>
      <label className="mt-4 block text-xs text-steel">
        Max workspace files
        <input
          type="number"
          className="mt-1 w-full rounded border border-line px-2 py-1 text-sm"
          value={state.maxWorkspaceFiles}
          onChange={(e) => setState({ ...state, maxWorkspaceFiles: Number(e.target.value) || 5000 })}
          onBlur={() => void save({ maxWorkspaceFiles: state.maxWorkspaceFiles })}
        />
      </label>
      <p className="mt-2 text-[10px] text-steel">Updated {new Date(state.updatedAt).toLocaleString()}</p>
    </div>
  );
}
