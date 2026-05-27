import {
  canUseGithubAppApi,
  hasGithubApiCredentials,
  loadGithubAuthConfig,
  type GithubAuthConfig
} from "@/lib/github/github-config";
import { getGithubAppInstallationToken } from "@/lib/github/github-installation-token";

let resolving: Promise<string | null> | null = null;

/** Bearer token for GitHub REST API: PAT preferred, else GitHub App installation token. */
export async function resolveGithubApiToken(config: GithubAuthConfig = loadGithubAuthConfig()): Promise<string | null> {
  if (config.pat) return config.pat;
  if (!canUseGithubAppApi(config) || !config.app) return null;

  if (!resolving) {
    resolving = getGithubAppInstallationToken(config.app)
      .catch((error) => {
        console.error("[BootRise] GitHub App token:", error instanceof Error ? error.message : error);
        return null;
      })
      .finally(() => {
        resolving = null;
      });
  }
  return resolving;
}

export function hasGithubTokenSync(config: GithubAuthConfig = loadGithubAuthConfig()): boolean {
  return hasGithubApiCredentials(config);
}

export async function githubApiHeaders(
  config: GithubAuthConfig = loadGithubAuthConfig()
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "BootRise-Workspace"
  };
  const token = await resolveGithubApiToken(config);
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
