import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { getCreditBalance } from "@/lib/usage/credit-store";
import { estimateCreditsForAction } from "@/lib/usage/credit-pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const action = new URL(req.url).searchParams.get("action");
    const balance = await getCreditBalance(ctx.orgId);
    const estimate = action ? estimateCreditsForAction(action) : null;
    return NextResponse.json({ product: "BootRise", balance, estimate });
  });
}
