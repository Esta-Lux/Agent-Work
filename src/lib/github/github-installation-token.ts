import { createGithubAppJwt } from "@/lib/github/github-app-jwt";
import { githubAppJwtIssuer, type GithubAppConfig } from "@/lib/github/github-config";

const TOKEN_CACHE = new Map<string, { token: string; expiresAt: number }>();

async function githubAppFetch(path: string, jwt: string, init?: RequestInit): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "BootRise-GitHub-App",
      Authorization: `Bearer ${jwt}`,
      ...(init?.headers ?? {})
    }
  });
}

async function resolveInstallationId(app: GithubAppConfig, jwt: string): Promise<string> {
  if (app.installationId) return app.installationId;

  const res = await githubAppFetch("/app/installations?per_page=10", jwt);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Could not list GitHub App installations (${res.status}). Install the app on your org/repo and set GITHUB_APP_INSTALLATION_ID. ${text.slice(0, 200)}`
    );
  }

  const rows = (await res.json()) as Array<{ id: number }>;
  if (rows.length === 0) {
    throw new Error(
      "GitHub App is not installed on any account. Open the install URL (see GET /api/github/status) and install the app, then set GITHUB_APP_INSTALLATION_ID."
    );
  }
  if (rows.length > 1) {
    throw new Error(
      `Multiple GitHub App installations (${rows.length}). Set GITHUB_APP_INSTALLATION_ID to the one you want (ids: ${rows.map((r) => r.id).join(", ")}).`
    );
  }
  return String(rows[0].id);
}

export async function getGithubAppInstallationToken(app: GithubAppConfig): Promise<string> {
  const jwtIssuer = githubAppJwtIssuer(app);
  if (!jwtIssuer || !app.privateKeyPem) {
    throw new Error(
      "GITHUB_APP_CLIENT_ID (preferred) or GITHUB_APP_ID, plus GITHUB_APP_PRIVATE_KEY, are required for installation tokens."
    );
  }

  const cacheKey = `${jwtIssuer}:${app.installationId ?? "auto"}`;
  const cached = TOKEN_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const jwt = createGithubAppJwt(jwtIssuer, app.privateKeyPem);
  const installationId = await resolveInstallationId(app, jwt);

  const res = await githubAppFetch(`/app/installations/${installationId}/access_tokens`, jwt, {
    method: "POST"
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub installation token failed (${res.status}): ${text.slice(0, 240)}`);
  }

  const data = (await res.json()) as { token?: string; expires_at?: string };
  if (!data.token) throw new Error("GitHub returned no installation access token.");

  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : Date.now() + 50 * 60_000;
  TOKEN_CACHE.set(cacheKey, { token: data.token, expiresAt });
  return data.token;
}
