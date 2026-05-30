import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { E2E_AUTH_ROLE_COOKIE, E2E_AUTH_USERS, isServerE2EAuthEnabled, normalizeE2EAuthRole } from "@/lib/auth/e2e-auth";
import type { AuthUser } from "@/lib/auth/types";

export function getE2EAuthRoleFromRequest(request: NextRequest) {
  if (!isServerE2EAuthEnabled()) return null;
  return normalizeE2EAuthRole(request.cookies.get(E2E_AUTH_ROLE_COOKIE)?.value);
}

export function getServerE2EAuthRole() {
  if (!isServerE2EAuthEnabled()) return null;
  return normalizeE2EAuthRole(cookies().get(E2E_AUTH_ROLE_COOKIE)?.value);
}

export function getServerE2EAuthUser(): AuthUser | null {
  const role = getServerE2EAuthRole();
  return role ? E2E_AUTH_USERS[role] : null;
}

export function isE2EAdminUser(user: AuthUser): boolean {
  return isServerE2EAuthEnabled() && user.id === E2E_AUTH_USERS.admin.id;
}
