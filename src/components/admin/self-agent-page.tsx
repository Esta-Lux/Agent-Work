"use client";

import { useEffect, useState } from "react";
import { BlockerRow } from "@/components/ui/blocker-row";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusPill } from "@/components/ui/status-pill";

interface GithubStatus {
  connected?: boolean;
  installationId?: string | null;
  account?: string | null;
  error?: string;
}

export function SelfAgentPage() {
  const [status, setStatus] = useState<GithubStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/github/status")
      .then((res) => res.json())
      .then((data: GithubStatus) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus({ connected: false, error: "GitHub status unavailable." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeader
        theme="admin"
        eyebrow="SELF-AGENT"
        title="BootRise improves itself"
        description="BootRise never edits main directly. Self-agent missions create scoped patches, run guard checks, and push to a branch only after admin approval."
      />
      <section className="grid gap-4 xl:grid-cols-3">
        <StatusCard title="Self repo" value={status?.connected ? status.account ?? "Connected" : "Disconnected"} variant={status?.connected ? "signal" : "amber"} />
        <StatusCard title="Provider" value="Key checked by provider health" variant="amber" />
        <StatusCard title="Target branch" value="not set" variant="amber" />
      </section>
      {status?.error ? <BlockerRow severity="warning" title="GitHub status unavailable" description={status.error} /> : null}
      <section className="rounded-lg border border-border-admin bg-panel-admin p-5">
        <p className="font-mono text-xs font-medium uppercase tracking-widest text-text-admin-3">Mission composer - preview</p>
        <div className="mt-4 rounded-lg bg-surface-admin px-5 py-8 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 font-mono text-sm text-text-admin-2">lock</div>
          <h2 className="mt-4 text-base font-semibold text-text-admin-1">Mission composer will unlock after validation</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-text-admin-2">
            Mission composer will let you describe a self-improvement goal, preview the blast radius, and approve the patch before it runs.
          </p>
        </div>
      </section>
      <section className="rounded-lg border border-border-admin bg-panel-admin p-4">
        <div className="flex flex-wrap gap-2">
          {["Plan", "Diff", "Trace", "Verify", "Agents", "Memory"].map((tab) => (
            <div key={tab} className="rounded-lg bg-surface-admin px-3 py-2 text-xs text-text-admin-3">
              lock {tab} - Available when a mission is running
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatusCard({ title, value, variant }: { title: string; value: string; variant: "signal" | "amber" }) {
  return (
    <article className="rounded-lg border border-border-admin bg-panel-admin p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text-admin-1">{title}</p>
        <StatusPill variant={variant} label={variant === "signal" ? "connected" : "setup"} />
      </div>
      <p className="mt-3 text-sm text-text-admin-2">{value}</p>
    </article>
  );
}

