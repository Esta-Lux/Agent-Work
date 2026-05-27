/**
 * GitHub App + PAT configuration (server-only).
 * Secrets belong in .env / .env.local — never commit real values.
 */

import fs from "node:fs";

export interface GithubAppConfig {
  clientId: string;
  clientSecret: string;
  appId: string | null;
  privateKeyPem: string | null;
  installationId: string | null;
  slug: string | null;
}

export interface GithubAuthConfig {
  pat: string | null;
  app: GithubAppConfig | null;
}

function readPrivateKey(): string | null {
  const inline = process.env.GITHUB_APP_PRIVATE_KEY?.trim();
  if (inline) return inline.replace(/\\n/g, "\n");

  const path = process.env.GITHUB_APP_PRIVATE_KEY_PATH?.trim();
  if (!path) return null;
  try {
    return fs.readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

export function loadGithubAuthConfig(): GithubAuthConfig {
  const clientId = process.env.GITHUB_APP_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET?.trim() ?? "";
  const appId = process.env.GITHUB_APP_ID?.trim() ?? "";
  const privateKeyPem = readPrivateKey();
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID?.trim() ?? "";
  const slug = process.env.GITHUB_APP_SLUG?.trim() ?? "";

  const app =
    clientId && clientSecret
      ? {
          clientId,
          clientSecret,
          appId: appId || null,
          privateKeyPem: privateKeyPem || null,
          installationId: installationId || null,
          slug: slug || null
        }
      : null;

  return {
    pat: process.env.GITHUB_TOKEN?.trim() || null,
    app
  };
}

export function isGithubAppConfigured(config: GithubAuthConfig = loadGithubAuthConfig()): boolean {
  return Boolean(config.app?.clientId && config.app?.clientSecret);
}

export function canUseGithubAppApi(config: GithubAuthConfig = loadGithubAuthConfig()): boolean {
  return Boolean(config.app?.appId && config.app?.privateKeyPem);
}

export function hasGithubApiCredentials(config: GithubAuthConfig = loadGithubAuthConfig()): boolean {
  return Boolean(config.pat || canUseGithubAppApi(config));
}

export function githubInstallUrl(config: GithubAuthConfig = loadGithubAuthConfig()): string | null {
  if (config.app?.slug) return `https://github.com/apps/${config.app.slug}/installations/new`;
  return null;
}

/** Safe summary for APIs / UI (no secrets). */
export function githubAuthStatus(config: GithubAuthConfig = loadGithubAuthConfig()) {
  return {
    pat: Boolean(config.pat),
    app: config.app
      ? {
          clientId: config.app.clientId,
          hasClientSecret: Boolean(config.app.clientSecret),
          appId: config.app.appId,
          hasPrivateKey: Boolean(config.app.privateKeyPem),
          installationId: config.app.installationId,
          slug: config.app.slug,
          canIssueInstallationToken: canUseGithubAppApi(config),
          installUrl: githubInstallUrl(config)
        }
      : null,
    ready: hasGithubApiCredentials(config)
  };
}
