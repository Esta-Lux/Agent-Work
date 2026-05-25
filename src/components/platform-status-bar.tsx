"use client";

import { useEffect, useState } from "react";
import { StatusPill } from "@/components/status-pill";

interface ProviderHealth {
  provider: "bootrise" | "openai";
  connected: boolean;
  model: string;
}

interface SupabaseStatus {
  configured?: boolean;
  schemaReady?: boolean;
  projectRef?: string | null;
  dashboardUrl?: string | null;
  message?: string;
  setupHint?: string | null;
}

interface PlatformStatusBarProps {
  variant: "user" | "admin";
  provider?: "bootrise" | "openai";
  storage?: "supabase" | "local" | "hybrid";
}

export function PlatformStatusBar({ variant, provider, storage }: PlatformStatusBarProps) {
  const [providers, setProviders] = useState<ProviderHealth[]>([]);
  const [supabase, setSupabase] = useState<SupabaseStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [providerRes, supabaseRes] = await Promise.all([
          fetch("/api/ai/providers/health"),
          fetch(variant === "admin" ? "/api/admin/supabase/overview" : "/api/admin/supabase/health")
        ]);
        const providerJson = (await providerRes.json()) as { providers?: ProviderHealth[] };
        setProviders(providerJson.providers ?? []);
        const supabaseJson = (await supabaseRes.json()) as { health?: SupabaseStatus } & SupabaseStatus;
        setSupabase(supabaseJson.health ?? supabaseJson);
      } catch {
        /* non-blocking */
      } finally {
        setLoading(false);
      }
    })();
  }, [variant]);

  const bootrise = providers.find((p) => p.provider === "bootrise");
  const openai = providers.find((p) => p.provider === "openai");
  const activeProvider = provider === "openai" ? openai : bootrise;

  return (
    <div className="rounded border border-line bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase text-steel">Platform status</p>
        {loading ? <StatusPill label="Checking" /> : null}
        {!loading && activeProvider ? (
          <StatusPill
            label={provider === "openai" ? `OpenAI ${activeProvider.connected ? "on" : "off"}` : `NVIDIA ${activeProvider.connected ? "on" : "off"}`}
            tone={activeProvider.connected ? "neutral" : "failed"}
          />
        ) : null}
        {!loading && bootrise && provider !== "openai" ? null : !loading && bootrise ? (
          <StatusPill label={`NVIDIA ${bootrise.connected ? "on" : "off"}`} tone={bootrise.connected ? "neutral" : "failed"} />
        ) : null}
        {!loading && openai && variant === "admin" ? (
          <StatusPill label={`OpenAI ${openai.connected ? "on" : "off"}`} tone={openai.connected ? "neutral" : "failed"} />
        ) : null}
        {!loading && supabase ? (
          <StatusPill
            label={supabase.schemaReady ? "Supabase ready" : supabase.configured ? "Supabase setup needed" : "Supabase off"}
            tone={supabase.schemaReady ? "neutral" : "failed"}
          />
        ) : null}
        {storage ? (
          <StatusPill
            label={storage === "supabase" ? "Cloud projects" : storage === "hybrid" ? "Cloud + local" : "Local projects"}
            tone="neutral"
          />
        ) : null}
      </div>

      {!loading && supabase && !supabase.schemaReady && supabase.configured ? (
        <p className="mt-2 text-xs leading-5 text-graphite">
          {supabase.setupHint ?? supabase.message}
          {supabase.dashboardUrl ? (
            <>
              {" "}
              <a className="font-semibold text-signal underline" href={supabase.dashboardUrl} target="_blank" rel="noreferrer">
                Open Supabase project{supabase.projectRef ? ` (${supabase.projectRef})` : ""}
              </a>
            </>
          ) : null}
        </p>
      ) : null}

      {variant === "admin" && !loading && supabase?.schemaReady ? (
        <p className="mt-2 text-xs text-steel">
          {bootrise?.model ? `BootRise model: ${bootrise.model}` : null}
          {openai?.model ? ` · OpenAI: ${openai.model}` : null}
        </p>
      ) : null}
    </div>
  );
}
