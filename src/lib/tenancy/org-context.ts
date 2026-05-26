import type { NextRequest } from "next/server";

export const DEFAULT_ORG_ID = process.env.BOOTRISE_DEFAULT_ORG_ID?.trim() || "org_default";

/**
 * @deprecated Use resolveUserOrgContext from @/lib/auth/org-auth — headers are not trusted for identity.
 */
export function resolveOrgId(request?: Request | NextRequest | null, explicit?: string | null): string {
  if (explicit?.trim()) return explicit.trim();
  return DEFAULT_ORG_ID;
}

/**
 * @deprecated Use session user id from @/lib/auth/server-auth.
 */
export function resolveActorId(_request?: Request | null): string {
  return "workspace-user";
}
