"use client";

import { useEffect, useState } from "react";

export function CreditsBadge() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    void fetch("/api/workspace/credits", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setRemaining(d.balance?.remaining ?? null))
      .catch(() => setRemaining(null));
  }, []);

  if (remaining === null) return null;
  return (
    <span className="rounded-full border border-line bg-cloud px-2 py-0.5 text-xs font-medium text-steel">
      {remaining.toLocaleString()} credits
    </span>
  );
}
