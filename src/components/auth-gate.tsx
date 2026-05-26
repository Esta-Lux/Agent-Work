"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { createBrowserClient } from "@supabase/ssr";

function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}

interface SessionUser {
  email: string | null;
}

function SessionSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-2 border-line" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-signal" />
      </div>
      <p className="mt-4 text-sm font-medium text-steel">Checking session…</p>
    </div>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const devBypass = process.env.NEXT_PUBLIC_BOOTRISE_DEV_AUTH_BYPASS === "1";

  useEffect(() => {
    if (devBypass) {
      setUser({ email: "dev@bootrise.local" });
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setUser(null);
      return;
    }
    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { email: data.user.email ?? null } : null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { email: session.user.email ?? null } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, [devBypass]);

  if (user === undefined) {
    return <SessionSpinner />;
  }

  if (!user && !devBypass) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 animate-slide-up">
        <div className="rounded-2xl border border-line bg-white p-10 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-signal to-signal-bright text-lg font-bold text-white shadow-glow">
            BR
          </div>
          <h2 className="mt-6 text-xl font-semibold text-ink">Sign in to your workspace</h2>
          <p className="mt-2 text-sm leading-relaxed text-steel">
            BootRise requires authentication before loading projects, running fixes, or opening the control
            layer.
          </p>
          <Link
            href="/auth/sign-in"
            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-signal px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-signal-bright"
          >
            Sign in
          </Link>
          <p className="mt-4 text-xs text-steel">
            Local dev without Supabase? Set <code className="text-graphite">BOOTRISE_DEV_AUTH_BYPASS=1</code> — see{" "}
            <span className="font-medium text-graphite">docs/DEV.md</span>.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function AuthHeaderActions() {
  const [email, setEmail] = useState<string | null>(null);
  const devBypass = process.env.NEXT_PUBLIC_BOOTRISE_DEV_AUTH_BYPASS === "1";

  useEffect(() => {
    if (devBypass) {
      setEmail("dev@bootrise.local");
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, [devBypass]);

  async function signOut() {
    const supabase = getSupabaseBrowser();
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/auth/sign-in";
  }

  if (!email && !devBypass) {
    return (
      <Link
        href="/auth/sign-in"
        className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-graphite transition hover:border-signal/40 hover:text-signal"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {devBypass ? (
        <span className="hidden rounded-full bg-signal/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-signal sm:inline">
          Dev
        </span>
      ) : null}
      <span className="hidden max-w-[140px] truncate text-xs text-steel sm:inline">{email}</span>
      <button
        type="button"
        onClick={signOut}
        className="rounded-xl border border-line bg-white px-3 py-1.5 text-sm font-semibold text-graphite transition hover:bg-cloud"
      >
        Sign out
      </button>
    </div>
  );
}
