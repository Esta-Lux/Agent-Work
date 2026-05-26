"use client";

import Link from "next/link";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { AuthShell } from "@/components/auth/auth-shell";

function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}

const devBypass = process.env.NEXT_PUBLIC_BOOTRISE_DEV_AUTH_BYPASS === "1";

function GitHubIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.15 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.62.24 2.85.12 3.15.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.205 0 1.59-.015 2.88-.015 3.285 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setStatus("error");
      setMessage("Supabase is not configured. Use dev bypass (see docs/DEV.md) or set Supabase env vars.");
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
    setMessage("Check your email for the sign-in link.");
  }

  async function signInWithGitHub() {
    const supabase = getSupabaseBrowser();
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
      title="Sign in"
      subtitle="Authenticate to use the workspace. Your projects are scoped to your organization."
    >
      {devBypass ? (
        <div className="mb-6 rounded-xl border border-signal/25 bg-signal/5 p-4">
          <p className="text-sm font-medium text-ink">Development mode</p>
          <p className="mt-1 text-xs text-steel">
            Auth bypass is on. No password — open the workspace directly.
          </p>
          <Link
            href="/"
            className="mt-3 flex w-full items-center justify-center rounded-xl bg-signal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-signal-bright"
          >
            Continue as dev user
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
          {status === "loading" ? "Sending…" : "Send magic link"}
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
        Continue with GitHub
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

      <Link
        href="/"
        className="mt-6 block text-center text-sm font-medium text-signal transition hover:text-signal-bright"
      >
        ← Back to workspace
      </Link>
    </AuthShell>
  );
}
