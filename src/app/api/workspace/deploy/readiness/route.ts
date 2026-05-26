import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { assertCreditsAvailable, chargeCredits } from "@/lib/usage/credit-store";
import { evaluateDeploymentReadiness } from "@/lib/deployment/deployment-readiness";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as { files?: SourceFileInput[] } | null;
    if (!body?.files?.length) {
      return NextResponse.json({ error: "files required." }, { status: 400 });
    }
    await assertCreditsAvailable(ctx.orgId, "deployment_readiness");
    const report = evaluateDeploymentReadiness(body.files);
    void chargeCredits({ orgId: ctx.orgId, userId: ctx.user.id, action: "deployment_readiness" });
    return NextResponse.json({ product: "BootRise", report });
  });
}
