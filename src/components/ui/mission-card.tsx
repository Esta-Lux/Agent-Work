import { CommandButton } from "@/components/ui/command-button";
import { StatusPill, type StatusPillVariant } from "@/components/ui/status-pill";

export type MissionCardStatus = "pending" | "running" | "complete" | "blocked" | "failed";

interface MissionCardProps {
  id: string;
  title: string;
  status: MissionCardStatus;
  branch?: string;
  createdAt: string;
  summary?: string;
  onView?: () => void;
}

const statusVariant: Record<MissionCardStatus, StatusPillVariant> = {
  pending: "neutral",
  running: "signal",
  complete: "signal",
  blocked: "amber",
  failed: "red"
};

export function MissionCard({ id, title, status, branch, createdAt, summary, onView }: MissionCardProps) {
  return (
    <article className="rounded-lg border border-border-admin bg-panel-admin p-3" data-mission-id={id}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-text-admin-1">{title}</h3>
            <StatusPill variant={statusVariant[status]} label={status} dot={status === "running"} />
          </div>
          <p className="mt-1 font-mono text-[10px] text-text-admin-3">{formatTime(createdAt)}</p>
        </div>
        {onView ? <CommandButton theme="admin" variant="ghost" size="sm" label="View" onClick={onView} /> : null}
      </div>
      {branch ? <code className="mt-3 inline-flex rounded-md bg-zinc-100 px-2 py-1 font-mono text-[11px] text-text-admin-2">{branch}</code> : null}
      {summary ? <p className="mt-3 text-xs leading-5 text-text-admin-2">{summary}</p> : null}
    </article>
  );
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
