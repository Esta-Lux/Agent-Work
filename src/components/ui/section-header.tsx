import type { ReactNode } from "react";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  theme: "admin" | "workspace";
}

export function SectionHeader({ eyebrow, title, description, action, theme }: SectionHeaderProps) {
  const titleColor = theme === "admin" ? "text-text-admin-1" : "text-text-ws-1";
  const descColor = theme === "admin" ? "text-text-admin-2" : "text-text-ws-2";

  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="font-mono text-xs font-medium uppercase tracking-widest text-signal">{eyebrow}</p> : null}
        <h1 className={`mt-1 truncate font-serif text-2xl italic ${titleColor}`}>{title}</h1>
        {description ? <p className={`mt-2 max-w-3xl text-sm leading-6 ${descColor}`}>{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
