import { NextResponse } from "next/server";
import { loadGithubAuthConfig } from "@/lib/github/github-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OAuth callback for GitHub App user authorization (optional dev flow).
 * Exchanges `code` for a user access token — useful when installation tokens are not set up yet.
 * Prefer GitHub App installation tokens (GITHUB_APP_CLIENT_ID or GITHUB_APP_ID, plus private key) for production.
 */
export async function GET(request: Request) {
  const config = loadGithubAuthConfig();
  const app = config.app;
  if (!app?.clientId || !app?.clientSecret) {
    return NextResponse.json({ error: "GITHUB_APP_CLIENT_ID and GITHUB_APP_CLIENT_SECRET are not set." }, { status: 503 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (error) {
    return NextResponse.json({ error: `GitHub OAuth denied: ${error}` }, { status: 400 });
  }
  if (!code) {
    return NextResponse.json({ error: "Missing code query parameter." }, { status: 400 });
  }

  const origin = url.origin;
  const redirectUri = `${origin}/api/github/oauth/callback`;

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: app.clientId,
      client_secret: app.clientSecret,
      code,
      redirect_uri: redirectUri
    })
  });

  const data = (await tokenRes.json()) as {
    access_token?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenRes.ok || data.error) {
    return NextResponse.json(
      { error: data.error_description ?? data.error ?? "Token exchange failed." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    scope: data.scope ?? null,
    hint:
      "For server import/push, prefer GitHub App installation tokens (GITHUB_APP_CLIENT_ID or GITHUB_APP_ID, plus GITHUB_APP_PRIVATE_KEY). You may set GITHUB_TOKEN to this user token for local dev only — do not commit it.",
    hasAccessToken: Boolean(data.access_token)
  });
}
