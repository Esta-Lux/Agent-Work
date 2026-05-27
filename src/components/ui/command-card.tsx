import type { ReactNode } from "react";
import { MetricTile } from "@/components/ui/metric-tile";

export function CommandCard({
  title,
  value,
  hint,
  children
}: {
  title: string;
  value: string;
  hint?: string;
  children?: ReactNode;
}) {
  return <MetricTile label={title} value={value} detail={hint}>{children}</MetricTile>;
}
