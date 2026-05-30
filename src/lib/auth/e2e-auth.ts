import type { AuthUser } from "@/lib/auth/types";

export const E2E_AUTH_ROLE_COOKIE = "bootrise_e2e_role";

export type E2EAuthRole = "workspace" | "admin";

export const E2E_AUTH_USERS: Record<E2EAuthRole, AuthUser> = {
  workspace: { id: "e2e-workspace-user", email: "workspace-e2e@bootrise.local" },
  admin: { id: "e2e-admin-user", email: "admin-e2e@bootrise.local" }
};

export function normalizeE2EAuthRole(value: string | null | undefined): E2EAuthRole | null {
  return value === "workspace" || value === "admin" ? value : null;
}

export function isServerE2EAuthEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== "production" && env.BOOTRISE_E2E_AUTH === "1";
}

export function isClientE2EAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_BOOTRISE_E2E_AUTH === "1";
}
