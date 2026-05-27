"use client";

import { useEffect, useState } from "react";

type GithubStatus = {
  pat: boolean;
  ready: boolean;
  app: {
    clientId: string;
    hasClientSecret: boolean;
    appId: string | null;
    hasPrivateKey: boolean;
    installationId: string | null;
    slug: string | null;
    canIssueInstallationToken: boolean;
    installUrl: string | null;
  } | null;
};

export function GithubConnectionStatus() {
  const [status, setStatus] = useState<GithubStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/github/status", { credentials: "include" });
        const data = (await res.json()) as GithubStatus;
        if (!cancelled) {
          setStatus(data);
          setError(res.ok ? null : "Could not load GitHub status.");
        }
      } catch {
        if (!cancelled) setError("GitHub status unavailable.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="mt-2 text-xs text-amber-800">{error}</p>;
  }
  if (!status) {
    return <p className="mt-2 text-xs text-steel">Checking GitHub credentials…</p>;
  }

  const app = status.app;
  const readyLabel = status.ready ? "Ready for private import, push, and PRs" : "Public repos only until App or PAT is configured";
  const readyClass = status.ready ? "text-signal" : "text-amber-800";

  return (
    <div className="mt-3 rounded-lg border border-line bg-cloud/60 px-3 py-2 text-xs">
      <p className={`font-semibold ${readyClass}`}>{readyLabel}</p>
      <ul className="mt-2 space-y-1 text-steel">
        {status.pat ? <li>Personal access token (GITHUB_TOKEN) — active</li> : null}
        {app ? (
          <>
            <li>GitHub App client configured ({app.clientId.slice(0, 8)}…)</li>
            <li>{app.appId ? `App ID ${app.appId}` : "Missing GITHUB_APP_ID"}</li>
            <li>{app.hasPrivateKey ? "Private key loaded" : "Missing GITHUB_APP_PRIVATE_KEY"}</li>
            <li>
              {app.canIssueInstallationToken
                ? app.installationId
                  ? `Installation ${app.installationId}`
                  : "Installation token (auto-detect)"
                : "Install app + complete App credentials"}
            </li>
          </>
        ) : (
          <li>No GitHub App env — add GITHUB_APP_CLIENT_ID in .env.local</li>
        )}
      </ul>
      {app?.installUrl && !status.ready ? (
        <a
          href={app.installUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block font-semibold text-signal underline"
        >
          Install GitHub App on your org/repo
        </a>
      ) : null}
      {!status.ready ? (
        <p className="mt-2 text-[10px] leading-relaxed text-steel">
          Server setup: docs/GITHUB_APP.md. Restart <code className="text-graphite">npm run dev</code> after editing
          .env.local.
        </p>
      ) : null}
    </div>
  );
}
