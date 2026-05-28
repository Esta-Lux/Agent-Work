import { AuthHeaderActions } from "@/components/auth-gate";
import { StatusPill } from "@/components/ui/status-pill";

interface WorkspaceTopbarV2Props {
  projectName: string;
  creditsRemaining: number | null;
}

export function WorkspaceTopbarV2({ projectName, creditsRemaining }: WorkspaceTopbarV2Props) {
  const creditsLabel = typeof creditsRemaining === "number" ? creditsRemaining.toLocaleString() : "...";
  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-border-ws bg-panel-ws px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-signal text-[11px] font-bold text-white">BR</div>
        <span className="font-serif text-lg italic text-text-ws-1">BootRise</span>
        <span className="h-5 w-px bg-border-ws-2" aria-hidden />
        <p className="truncate text-sm">
          <span className="text-text-ws-2">Project: </span>
          <span className="text-text-ws-1">{projectName || "Untitled workspace"}</span>
        </p>
        <StatusPill variant="signal" label="fast" />
      </div>
      <div className="flex items-center gap-3">
        <div className="font-mono text-xs text-text-ws-2">
          <span className="text-signal-text">{creditsLabel}</span> credits
        </div>
        {process.env.NODE_ENV !== "production" ? <StatusPill variant="blue" label="DEV" /> : null}
        <AuthHeaderActions />
      </div>
    </header>
  );
}
