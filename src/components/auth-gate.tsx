"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { isClientDevAuthBypass } from "@/lib/auth/dev-bypass";
import { E2E_AUTH_ROLE_COOKIE, isClientE2EAuthEnabled } from "@/lib/auth/e2e-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

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
  const devBypass = isClientDevAuthBypass();
  const e2eAuth = isClientE2EAuthEnabled();

  useEffect(() => {
    if (devBypass) {
      setUser({ email: "dev@bootrise.local" });
      return;
    }
    if (e2eAuth) {
      void fetch("/api/workspace/me", { credentials: "include" })
        .then(async (response) => {
          if (!response.ok) return null;
          const data = (await response.json()) as { user?: SessionUser | null };
          return data.user ?? null;
        })
        .then((nextUser) => setUser(nextUser))
        .catch(() => setUser(null));
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setUser(null);
      return;
    }
    void supabase.auth.getUser().then(({ data }: { data: { user: { email?: string | null } | null } }) => {
      setUser(data.user ? { email: data.user.email ?? null } : null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event: string, session: { user?: { email?: string | null } } | null) => {
      setUser(session?.user ? { email: session.user.email ?? null } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, [devBypass, e2eAuth]);

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
            href="/login"
            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-signal px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-signal-bright"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-line bg-white px-6 py-2.5 text-sm font-semibold text-graphite transition hover:border-signal/40 hover:text-signal"
          >
            Create account
          </Link>
          <p className="mt-4 text-xs text-steel">
            On localhost, auth is bypassed by default in <code className="text-graphite">npm run dev</code>. If you see
            this screen, restart the dev server or see <span className="font-medium text-graphite">docs/DEV.md</span>.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function AuthHeaderActions() {
  const [email, setEmail] = useState<string | null>(null);
  const devBypass = isClientDevAuthBypass();
  const e2eAuth = isClientE2EAuthEnabled();

  useEffect(() => {
    if (devBypass) {
      setEmail("dev@bootrise.local");
      return;
    }
    if (e2eAuth) {
      void fetch("/api/workspace/me", { credentials: "include" })
        .then(async (response) => {
          if (!response.ok) return null;
          const data = (await response.json()) as { user?: SessionUser | null };
          return data.user?.email ?? null;
        })
        .then((nextEmail) => setEmail(nextEmail))
        .catch(() => setEmail(null));
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }: { data: { user?: { email?: string | null } | null } }) =>
      setEmail(data.user?.email ?? null)
    );
  }, [devBypass, e2eAuth]);

  async function signOut() {
    if (devBypass) {
      window.location.reload();
      return;
    }
    if (e2eAuth) {
      document.cookie = `${E2E_AUTH_ROLE_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
      window.location.href = "/login";
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (!email && !devBypass) {
    return (
      <Link
        href="/login"
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
