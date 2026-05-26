"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isForbidden = error.message.toLowerCase().includes("admin");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-cloud px-4">
      <div className="max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wider text-critical">
          {isForbidden ? "Access denied" : "Something went wrong"}
        </p>
        <h1 className="mt-2 text-xl font-semibold text-ink">
          {isForbidden ? "Admin access required" : "Admin console error"}
        </h1>
        <p className="mt-2 text-sm text-steel">
          {isForbidden
            ? "Your account is signed in but is not on the BootRise admin allowlist or org admin role."
            : error.message}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {!isForbidden ? (
            <button
              type="button"
              onClick={reset}
              className="rounded-xl bg-signal px-4 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          ) : null}
          <Link
            href="/"
            className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-graphite"
          >
            Back to workspace
          </Link>
        </div>
      </div>
    </main>
  );
}
