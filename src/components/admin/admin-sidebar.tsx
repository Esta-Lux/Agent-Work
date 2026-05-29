import Link from "next/link";

type AdminSection =
  | "overview"
  | "user-health"
  | "self-agent"
  | "readiness"
  | "providers"
  | "data"
  | "usage"
  | "control"
  | "security"
  | "audit";

interface AdminSidebarProps {
  currentSection: AdminSection;
}

const groups: Array<{
  label: string;
  items: Array<{ id: AdminSection; label: string; icon: string; core?: boolean }>;
}> = [
  {
    label: "Monitor",
    items: [
      { id: "overview", label: "Overview", icon: "OV" },
      { id: "user-health", label: "User Workspace Health", icon: "UH" },
      { id: "self-agent", label: "Self-Agent", icon: "SA", core: true },
      { id: "readiness", label: "Readiness", icon: "RD" }
    ]
  },
  {
    label: "Systems",
    items: [
      { id: "providers", label: "Providers", icon: "PR" },
      { id: "data", label: "Data", icon: "DT" },
      { id: "usage", label: "Usage", icon: "US" }
    ]
  },
  {
    label: "Control",
    items: [
      { id: "control", label: "Control", icon: "CT" },
      { id: "security", label: "Security", icon: "SE" },
      { id: "audit", label: "Audit", icon: "AU" }
    ]
  }
];

export function AdminSidebar({ currentSection }: AdminSidebarProps) {
  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border-admin bg-panel-admin">
      <div className="flex h-[52px] items-center gap-3 border-b border-border-admin px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-signal text-[11px] font-bold text-white">BR</div>
        <div>
          <p className="font-serif text-lg italic text-text-admin-1">BootRise</p>
          <p className="font-mono text-[9px] uppercase tracking-widest text-text-admin-3">Ops</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group, groupIndex) => (
          <div key={group.label} className={groupIndex === 0 ? "" : "mt-4 border-t border-border-admin pt-4"}>
            <p className="px-2 font-mono text-[10px] font-medium uppercase tracking-widest text-text-admin-3">{group.label}</p>
            <ul className="mt-2 space-y-1">
              {group.items.map((item) => {
                const active = item.id === currentSection;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.id === "overview" ? "/admin" : `/admin/${item.id}`}
                      className={`relative flex h-9 items-center gap-2 rounded-lg px-3 text-sm transition ${
                        active
                          ? "bg-signal-glow font-medium text-text-admin-1 before:absolute before:left-0 before:top-1.5 before:h-6 before:w-[3px] before:rounded-r before:bg-signal"
                          : "text-text-admin-2 hover:bg-zinc-50"
                      }`}
                    >
                      <span className="flex h-5 w-7 shrink-0 items-center justify-center rounded bg-zinc-100 font-mono text-[9px] uppercase text-text-admin-3">{item.icon}</span>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.core ? <span className="h-1.5 w-1.5 rounded-full bg-signal" aria-label="Core feature" /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-border-admin px-4 py-3 font-mono text-xs text-text-admin-3">BootRise v0.x</div>
    </aside>
  );
}
