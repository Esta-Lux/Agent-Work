import { AuthHeaderActions } from "@/components/auth-gate";
import { StatusPill } from "@/components/ui/status-pill";

interface AdminTopbarProps {
  currentSection: string;
}

export function AdminTopbar({ currentSection }: AdminTopbarProps) {
  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-border-admin bg-panel-admin px-5">
      <div className="flex items-center gap-2">
        <span className="font-serif text-[17px] italic text-text-admin-1">BootRise</span>
        <span className="text-text-admin-3">/</span>
        <span className="text-sm font-medium capitalize text-text-admin-2">{currentSection.replace(/-/g, " ")}</span>
      </div>
      <div className="flex items-center gap-3">
        <StatusPill variant="amber" label="68% ready" />
        <StatusPill variant={process.env.NODE_ENV === "production" ? "signal" : "blue"} label={process.env.NODE_ENV === "production" ? "PROD" : "DEV"} />
        <AuthHeaderActions />
      </div>
    </header>
  );
}

