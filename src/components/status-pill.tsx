import type { RiskLevel, VerificationStatus } from "@/lib/types/core";

interface StatusPillProps {
  label: string;
  tone?: RiskLevel | VerificationStatus | "neutral";
}

const toneClassName: Record<NonNullable<StatusPillProps["tone"]>, string> = {
  low: "border-signal/25 bg-signal/10 text-signal",
  medium: "border-caution/30 bg-caution/10 text-caution",
  high: "border-critical/25 bg-critical/10 text-critical",
  pending: "border-steel/25 bg-white text-steel",
  passed: "border-signal/25 bg-signal/10 text-signal",
  failed: "border-critical/25 bg-critical/10 text-critical",
  skipped: "border-line bg-cloud text-steel",
  neutral: "border-line bg-white text-graphite"
};

export function StatusPill({ label, tone = "neutral" }: StatusPillProps) {
  return (
    <span className={`inline-flex items-center rounded border px-2 py-1 text-xs font-medium ${toneClassName[tone]}`}>
      {label}
    </span>
  );
}

