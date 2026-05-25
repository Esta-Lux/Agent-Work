"use client";

import { useEffect, useState, type ReactNode } from "react";

export function ClientMounted({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      fallback ?? (
        <div className="rounded-lg border border-line bg-white px-4 py-8 text-center text-sm text-steel">
          Loading workspace…
        </div>
      )
    );
  }

  return children;
}
