import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { assertKillSwitchAllowed } from "@/lib/admin/kill-switches";
import { getPendingFix } from "@/lib/workspace/pending-fix-store";
import { createDiffPreviewFromPatches } from "@/lib/workspace/diff-from-patches";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdminAuth(request, async (_user, req) => {
    try {
      assertKillSwitchAllowed("admin_agent");
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Admin agent disabled." },
        { status: 403 }
      );
    }
    const url = new URL(req.url);
    const pendingFixId = url.searchParams.get("pendingFixId")?.trim();
    const orgId = url.searchParams.get("orgId")?.trim() || undefined;
    if (!pendingFixId) {
      return NextResponse.json({ error: "pendingFixId is required." }, { status: 400 });
    }
    try {
      const pending = await getPendingFix(pendingFixId, orgId);
      if (!pending) {
        return NextResponse.json({ error: "Pending fix not found." }, { status: 404 });
      }
      const diff = createDiffPreviewFromPatches(
        pending.plan.id,
        pending.patches,
        pending.plan.risk.reasons
      );
      return NextResponse.json({
        product: "BootRise",
        pendingFixId: pending.id,
        status: pending.status,
        request: pending.request,
        diff,
        plan: pending.plan,
        patches: pending.patches.map((patch) => ({
          path: patch.path,
          summary: patch.summary,
          beforeBytes: patch.before.length,
          afterBytes: patch.after.length
        }))
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not load diff." },
        { status: 500 }
      );
    }
  });
}
