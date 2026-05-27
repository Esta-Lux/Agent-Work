import { NextResponse } from "next/server";
import { loadGithubAuthConfig } from "@/lib/github/github-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Redirect to GitHub OAuth (user token) — dev helper when App installation is not configured. */
export async function GET(request: Request) {
  const config = loadGithubAuthConfig();
  const app = config.app;
  if (!app?.clientId) {
    return NextResponse.json({ error: "GITHUB_APP_CLIENT_ID is not set." }, { status: 503 });
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/github/oauth/callback`;
  const params = new URLSearchParams({
    client_id: app.clientId,
    redirect_uri: redirectUri,
    scope: "repo read:org",
    state: "bootrise"
  });

  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}
