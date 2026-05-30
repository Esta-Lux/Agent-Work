"use client";

import { StatusPill } from "@/components/ui/status-pill";
import type { ProviderDuelResult } from "@/lib/ai/provider-duel";

export function ProviderDuelPanel({ results }: { results: ProviderDuelResult[] }) {
  if (results.length === 0) return null;
  return (
    <section className="rounded-lg bg-card-ws p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-text-ws-3">Provider duel</p>
      <div className="mt-3 grid grid-cols-[1fr_64px_64px_64px_64px_1fr] gap-2 text-xs text-text-ws-2">
        <span>Provider</span>
        <span>Credits</span>
        <span>Score</span>
        <span>Conf</span>
        <span>Vague</span>
        <span>Recommendation</span>
        {results.map((result) => (
          <div key={result.provider} className="contents">
            <span className="font-semibold text-text-ws-1">{result.provider}</span>
            <span>{result.estimatedCredits}</span>
            <span>{result.completionScore}</span>
            <span>{result.confidence}</span>
            <span>{result.vagueOutputFindings}</span>
            <StatusPill variant={result.recommendation === "blocked" || result.recommendation === "not_available" ? "amber" : "signal"} label={result.recommendation.replace(/_/g, " ")} />
            {result.planExcerpt ? <p className="col-span-6 mt-1 text-[11px] leading-5 text-text-ws-2">{result.planExcerpt}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
