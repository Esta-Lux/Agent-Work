import path from "node:path";
import type { FullConfig } from "playwright/test";

export const E2E_AUTH_ROLE_COOKIE = "bootrise_e2e_role";
export const authDir = path.join(process.cwd(), "playwright", ".auth");
export const workspaceAuthFile = path.join(authDir, "workspace.json");
export const adminAuthFile = path.join(authDir, "admin.json");

export function strictBaseUrl(config: FullConfig): string {
  return config.projects.find((project) => project.name === "workspace-strict")?.use?.baseURL?.toString() ?? "http://127.0.0.1:3101";
}
