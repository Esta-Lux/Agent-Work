"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { isClientDevAuthBypass } from "@/lib/auth/dev-bypass";
import { getSupabaseBrowserClient, isSupabaseBrowserConfigured } from "@/lib/supabase/browser-client";

const devBypass = isClientDevAuthBypass();

function GitHubIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.15 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.62.24 2.85.12 3.15.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.205 0 1.59-.015 2.88-.015 3.285 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export function AuthEntryPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const isSignup = mode === "sign-up";

  useEffect(() => {
    if (!devBypass) return;
    const next = new URLSearchParams(window.location.search).get("next") ?? "/";
    router.replace(next);
  }, [router]);

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setStatus("error");
      setMessage(
        "Supabase is not configured. Enable dev bypass in .env.local (see docs/DEV.md) and restart npm run dev, or add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
      );
      return;
    }
    setStatus("loading");
    const origin = window.location.origin;
    const next = new URLSearchParams(window.location.search).get("next") ?? "/";
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` }
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("sent");
    setMessage(isSignup ? "Check your email to finish creating your BootRise account." : "Check your email for the sign-in link.");
  }

  async function signInWithGitHub() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setStatus("error");
      setMessage("Supabase is not configured.");
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next") ?? "/";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` }
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    }
  }

  return (
    <AuthShell
      title={isSignup ? "Create your workspace account" : "Sign in"}
      subtitle={
        isSignup
          ? "Create a BootRise account to open projects, import repos, and work inside your organization."
          : "Authenticate to use the workspace. Your projects are scoped to your organization."
      }
    >
      {devBypass ? (
        <div className="mb-6 rounded-xl border border-signal/25 bg-signal/5 p-4">
          <p className="text-sm font-medium text-ink">Local development</p>
          <p className="mt-1 text-xs text-steel">Auth is bypassed on localhost — redirecting to workspace…</p>
        </div>
      ) : !isSupabaseBrowserConfigured() ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-ink">Supabase URL not visible to the browser</p>
          <p className="mt-1 text-xs leading-relaxed text-steel">
            Add <code className="text-graphite">NEXT_PUBLIC_SUPABASE_URL</code> (same value as{" "}
            <code className="text-graphite">SUPABASE_URL</code>) and your publishable key to{" "}
            <code className="text-graphite">.env</code> or <code className="text-graphite">.env.local</code>, then restart{" "}
            <code className="text-graphite">npm run dev</code>. Or enable dev bypass — see <strong>docs/DEV.md</strong>.
          </p>
          <p className="mt-2 text-xs text-steel">
            Local dev normally skips login automatically; you only need these vars if bypass was disabled.
          </p>
          <Link href="/" className="mt-3 block text-center text-sm font-semibold text-signal">
            Try workspace anyway →
          </Link>
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={sendMagicLink}>
        <label className="block text-sm font-medium text-graphite">
          Work email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-steel/70 focus:border-signal focus:ring-2 focus:ring-signal/20"
            placeholder="you@company.com"
            autoComplete="email"
          />
        </label>
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex w-full items-center justify-center rounded-xl bg-signal px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-signal-bright disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? "Sending…" : isSignup ? "Create account with magic link" : "Send magic link"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <span className="text-xs font-medium uppercase tracking-wide text-steel">or</span>
        <div className="h-px flex-1 bg-line" />
      </div>

      <button
        type="button"
        onClick={signInWithGitHub}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-graphite transition hover:border-graphite/30 hover:bg-cloud"
      >
        <GitHubIcon />
        {isSignup ? "Create account with GitHub" : "Continue with GitHub"}
      </button>

      {message ? (
        <p
          className={`mt-4 rounded-lg px-3 py-2 text-sm ${
            status === "error" ? "bg-critical/10 text-critical" : "bg-cloud text-steel"
          }`}
          role="status"
        >
          {message}
        </p>
      ) : null}

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { title: "Connect", detail: "Import GitHub repos with full or key-file modes." },
          { title: "Control layer", detail: "Scope lock, patch guard, and approval before any edit lands." },
          { title: "Ship safely", detail: "Verify in sandbox, then export or open a draft PR." }
        ].map((card) => (
          <div key={card.title} className="rounded-xl border border-line bg-cloud/40 px-4 py-3 text-left">
            <p className="text-xs font-semibold text-ink">{card.title}</p>
            <p className="mt-1 text-[11px] leading-5 text-steel">{card.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-steel">
        <span>{isSignup ? "Already have an account?" : "Need an account?"}</span>
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-semibold text-signal transition hover:text-signal-bright"
        >
          {isSignup ? "Sign in" : "Sign up"}
        </Link>
      </div>

      <Link href="/" className="mt-6 block text-center text-sm font-medium text-signal transition hover:text-signal-bright">
        ← Back to workspace
      </Link>
    </AuthShell>
  );
}
