"use client";

import { useEffect, useState } from "react";
import { StatusPill } from "@/components/status-pill";

interface ReadinessReport {
  productionReady: boolean;
  score: number;
  items: Array<{ area: string; status: string; summary: string; nextStep: string }>;
}

interface AiHealth {
  connected: boolean;
  model?: string;
  message?: string;
}

export function AdminConsole() {
  const [readiness, setReadiness] = useState<ReadinessReport | null>(null);
  const [aiHealth, setAiHealth] = useState<AiHealth | null>(null);
  const [supabaseOk, setSupabaseOk] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [status, setStatus] = useState("Loading");

  useEffect(() => {
    void loadOverview();
  }, []);

  async function loadOverview() {
    setStatus("Loading");
    try {
      const [readinessRes, aiRes, supabaseRes] = await Promise.all([
        fetch("/api/admin/readiness"),
        fetch("/api/ai/health"),
        fetch("/api/admin/supabase/health")
      ]);
      setReadiness((await readinessRes.json()) as ReadinessReport);
      setAiHealth((await aiRes.json()) as AiHealth);
      const supabase = (await supabaseRes.json()) as { ok?: boolean };
      setSupabaseOk(Boolean(supabase.ok));
      setStatus("Ready");
    } catch {
      setStatus("Degraded");
    }
  }

  async function sendAdminMessage() {
    if (!message.trim()) return;
    setStatus("Thinking");
    try {
      const response = await fetch("/api/ai/admin-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), model: "bootrise" })
      });
      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Admin chat failed.");
      setReply(data.reply ?? null);
      setStatus("Ready");
    } catch (caught) {
      setReply(caught instanceof Error ? caught.message : "Admin chat failed.");
      setStatus("Blocked");
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-steel">Operator control</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">Platform overview</h2>
        </div>
        <StatusPill label={status} />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Production ready" value={readiness?.productionReady ? "Yes" : "No"} />
        <StatCard label="Readiness score" value={readiness ? `${readiness.score}%` : "—"} />
        <StatCard label="OpenAI" value={aiHealth?.connected ? "Connected" : "Fallback"} />
        <StatCard label="Supabase" value={supabaseOk === null ? "—" : supabaseOk ? "OK" : "Off"} />
      </div>

      {readiness ? (
        <div className="mb-6 rounded border border-line bg-white p-4">
          <p className="text-sm font-semibold text-ink">Launch blockers</p>
          <ul className="mt-3 space-y-2">
            {readiness.items.map((item) => (
              <li key={item.area} className="rounded border border-line bg-cloud p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{item.area}</span>
                  <StatusPill label={item.status} />
                </div>
                <p className="mt-1 text-graphite">{item.summary}</p>
                <p className="mt-1 text-xs text-steel">Next: {item.nextStep}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded border border-line bg-white p-4">
          <p className="text-sm font-semibold text-ink">Admin operator chat</p>
          <p className="mt-1 text-xs text-steel">Internal ops only — user building happens on the public workspace.</p>
          <textarea
            className="mt-3 min-h-24 w-full rounded border border-line bg-cloud p-3 text-sm"
            placeholder="Ask about readiness, cost, or platform changes..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button
            type="button"
            className="mt-2 rounded bg-ink px-4 py-2 text-sm font-semibold text-white"
            onClick={sendAdminMessage}
          >
            Send
          </button>
          {reply ? (
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-cloud p-3 text-xs leading-5 text-graphite">
              {reply}
            </pre>
          ) : null}
        </div>

        <div className="rounded border border-line bg-white p-4 text-sm text-graphite">
          <p className="font-semibold text-ink">Quick checks</p>
          <ul className="mt-3 list-inside list-disc space-y-2 text-xs leading-5">
            <li>
              <a className="text-signal underline" href="/api/admin/readiness">
                /api/admin/readiness
              </a>
            </li>
            <li>
              <a className="text-signal underline" href="/api/admin/unit-economics">
                /api/admin/unit-economics
              </a>
            </li>
            <li>
              <a className="text-signal underline" href="/api/ai/health">
                /api/ai/health
              </a>
            </li>
            <li>
              <a className="text-signal underline" href="/">
                User workspace
              </a>
            </li>
          </ul>
          <button
            type="button"
            className="mt-4 rounded border border-line px-4 py-2 text-sm font-semibold text-graphite"
            onClick={loadOverview}
          >
            Refresh status
          </button>
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-line bg-white p-4">
      <p className="text-xs font-semibold uppercase text-steel">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}
