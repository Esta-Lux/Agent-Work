import { chromium, type FullConfig } from "playwright/test";
import { mkdirSync } from "node:fs";
import { authDir, E2E_AUTH_ROLE_COOKIE, strictBaseUrl, workspaceAuthFile, adminAuthFile } from "./support/auth";

async function writeStorageState(path: string, role: "workspace" | "admin", config: FullConfig) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: strictBaseUrl(config) });
  await context.addCookies([
    {
      name: E2E_AUTH_ROLE_COOKIE,
      value: role,
      url: strictBaseUrl(config),
      sameSite: "Lax"
    }
  ]);
  await context.storageState({ path });
  await browser.close();
}

export default async function globalSetup(config: FullConfig) {
  mkdirSync(authDir, { recursive: true });
  await writeStorageState(workspaceAuthFile, "workspace", config);
  await writeStorageState(adminAuthFile, "admin", config);
}
