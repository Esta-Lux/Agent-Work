import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { assertCreditsAvailable, chargeCredits } from "@/lib/usage/credit-store";
import { runSecurityScan } from "@/lib/security/security-scan";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as { files?: SourceFileInput[] } | null;
    if (!body?.files?.length) {
      return NextResponse.json({ error: "files required." }, { status: 400 });
    }
    await assertCreditsAvailable(ctx.orgId, "basic_security_scan");
    const findings = runSecurityScan(body.files);
    void chargeCredits({ orgId: ctx.orgId, userId: ctx.user.id, action: "basic_security_scan" });
    return NextResponse.json({
      product: "BootRise",
      findings,
      criticalCount: findings.filter((f) => f.severity === "critical").length
    });
  });
}
