import type { NextRequest } from "next/server";

export const DEFAULT_ORG_ID = process.env.BOOTRISE_DEFAULT_ORG_ID?.trim() || "org_default";

export function resolveOrgId(request?: Request | NextRequest | null, explicit?: string | null): string {
  if (explicit?.trim()) return explicit.trim();

  if (request) {
    const header = request.headers.get("x-bootrise-org-id")?.trim();
    if (header) return header;
  }

  return DEFAULT_ORG_ID;
}

export function resolveActorId(request?: Request | null): string {
  if (request) {
    const actor = request.headers.get("x-bootrise-user-id")?.trim();
    if (actor) return actor;
  }
  return "workspace-user";
}
