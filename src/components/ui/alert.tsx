import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type AlertTone = "info" | "success" | "warning" | "danger";

interface AlertProps {
  title?: string;
  children: ReactNode;
  tone?: AlertTone;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  className?: string;
}

const tones: Record<AlertTone, string> = {
  info: "border-line bg-cloud/70 text-graphite",
  success: "border-signal/25 bg-signal/10 text-signal",
  warning: "border-caution/30 bg-caution/10 text-caution",
  danger: "border-critical/25 bg-critical/10 text-critical"
};

export function Alert({ title, children, tone = "info", action, onDismiss, className = "" }: AlertProps) {
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]} ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {title ? <p className="font-semibold text-ink">{title}</p> : null}
          <div className={title ? "mt-1 leading-6" : "leading-6"}>{children}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action ? (
            <Button type="button" size="sm" variant={tone === "danger" ? "danger" : "secondary"} onClick={action.onClick}>
              {action.label}
            </Button>
          ) : null}
          {onDismiss ? (
            <button type="button" className="cursor-pointer text-xs font-semibold text-steel hover:text-ink" onClick={onDismiss}>
              Dismiss
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
