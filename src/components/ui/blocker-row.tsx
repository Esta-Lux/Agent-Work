"use client";

import { CommandButton } from "@/components/ui/command-button";

export type BlockerSeverity = "critical" | "warning" | "info";

interface BlockerRowProps {
  severity: BlockerSeverity;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

const styles: Record<BlockerSeverity, { row: string; bar: string; icon: string; glyph: string }> = {
  critical: { row: "bg-red-400/5", bar: "bg-red-400", icon: "text-red-400", glyph: "!" },
  warning: { row: "bg-amber-400/5", bar: "bg-amber-400", icon: "text-amber-400", glyph: "!" },
  info: { row: "bg-blue-500/5", bar: "bg-blue-500", icon: "text-blue-400", glyph: "i" }
};

export function BlockerRow({ severity, title, description, action }: BlockerRowProps) {
  const style = styles[severity];
  return (
    <div className={`flex overflow-hidden rounded-lg ${style.row}`}>
      <div className={`w-1 shrink-0 ${style.bar}`} aria-hidden />
      <div className="flex min-w-0 flex-1 items-start gap-3 px-3 py-3">
        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-current/10 text-xs font-bold ${style.icon}`}>
          {style.glyph}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-inherit">{title}</p>
          <p className="mt-0.5 text-xs leading-5 text-inherit opacity-75">{description}</p>
        </div>
        {action ? (
          <CommandButton theme="admin" variant="ghost" size="sm" label={action.label} onClick={action.onClick} />
        ) : null}
      </div>
    </div>
  );
}
