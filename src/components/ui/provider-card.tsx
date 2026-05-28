import { StatusPill, type StatusPillVariant } from "@/components/ui/status-pill";

export type ProviderCardStatus = "connected" | "missing" | "degraded";

interface ProviderCardProps {
  name: string;
  status: ProviderCardStatus;
  description: string;
  envVar: string;
  docsUrl?: string;
}

const statusVariant: Record<ProviderCardStatus, StatusPillVariant> = {
  connected: "signal",
  missing: "amber",
  degraded: "red"
};

export function ProviderCard({ name, status, description, envVar, docsUrl }: ProviderCardProps) {
  return (
    <article className={`rounded-lg border border-border-admin bg-panel-admin p-4 ${status === "missing" ? "bg-amber-400/5" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-text-admin-1">{name}</h3>
        <StatusPill variant={statusVariant[status]} label={status} dot={status === "connected"} />
      </div>
      <p className="mt-3 text-sm leading-6 text-text-admin-2">{description}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <code className="truncate rounded-md bg-zinc-100 px-2 py-1 font-mono text-[11px] text-text-admin-2">{envVar}</code>
        {docsUrl ? (
          <a className="text-xs font-medium text-text-admin-3 hover:text-text-admin-1" href={docsUrl} target="_blank" rel="noreferrer">
            View docs
          </a>
        ) : null}
      </div>
    </article>
  );
}
