import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { getEnvSetupSnippet, getProviderKeysStatus } from "@/lib/admin/provider-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdminAuth(request, async () => {
    const statuses = getProviderKeysStatus();
    const missing = statuses.filter((s) => !s.present);
    const envSnippet = getEnvSetupSnippet(missing);
    const ready = statuses.some((s) => (s.id === "nvidia" || s.id === "openai") && s.present);
    return NextResponse.json({ product: "BootRise", statuses, envSnippet, ready });
  });
}
