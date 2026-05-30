import { existsSync } from "node:fs";
import { resolve } from "node:path";

export interface GithubAppReadiness {
  appIdConfigured: boolean;
  clientIdConfigured: boolean;
  privateKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  installationCallbackRouteExists: boolean;
  tokenFallbackAvailable: boolean;
  publicImportAvailable: boolean;
  draftPrRouteAvailable: boolean;
  missingEnvVars: string[];
}

export function getGithubAppReadiness(): GithubAppReadiness {
  const appIdConfigured = Boolean(process.env.GITHUB_APP_ID?.trim());
  const clientIdConfigured = Boolean(process.env.GITHUB_APP_CLIENT_ID?.trim());
  const privateKeyConfigured = Boolean(process.env.GITHUB_APP_PRIVATE_KEY?.trim());
  const webhookSecretConfigured = Boolean(process.env.GITHUB_WEBHOOK_SECRET?.trim());
  const tokenFallbackAvailable = Boolean(process.env.GITHUB_TOKEN?.trim());
  const installationCallbackRouteExists = existsSync(resolve(process.cwd(), "src/app/api/github/callback/route.ts"));
  const draftPrRouteAvailable = existsSync(resolve(process.cwd(), "src/app/api/workspace/github/pr/route.ts"));
  const missingEnvVars = [
    appIdConfigured ? null : "GITHUB_APP_ID",
    clientIdConfigured ? null : "GITHUB_APP_CLIENT_ID",
    privateKeyConfigured ? null : "GITHUB_APP_PRIVATE_KEY",
    webhookSecretConfigured ? null : "GITHUB_WEBHOOK_SECRET"
  ].filter((value): value is string => Boolean(value));

  return {
    appIdConfigured,
    clientIdConfigured,
    privateKeyConfigured,
    webhookSecretConfigured,
    installationCallbackRouteExists,
    tokenFallbackAvailable,
    publicImportAvailable: true,
    draftPrRouteAvailable,
    missingEnvVars
  };
}
