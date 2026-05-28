import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { DEFAULT_ORG_ID } from "@/lib/tenancy/org-context";
import { updateDetectionStatus } from "@/lib/admin/detections/store";
import type { DetectionStatus } from "@/lib/admin/detections/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED: DetectionStatus[] = ["acknowledged", "resolved", "false_positive"];

interface Body {
  status?: string;
}

export async function POST(request: Request, ctx: { params: { id: string } }) {
  return withAdminAuth(request, async (user, req) => {
    const body = (await req.json().catch(() => null)) as Body | null;
    const status = body?.status as DetectionStatus | undefined;
    if (!status || !ALLOWED.includes(status)) {
      return NextResponse.json({ error: `status must be one of ${ALLOWED.join(", ")}` }, { status: 400 });
    }
    const updated = updateDetectionStatus(ctx.params.id, status, user.id, DEFAULT_ORG_ID);
    if (!updated) {
      return NextResponse.json({ error: `Detection ${ctx.params.id} not found.` }, { status: 404 });
    }
    return NextResponse.json({ product: "BootRise", detection: updated });
  });
}
