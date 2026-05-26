import { NextResponse } from "next/server";
import { rejectPendingFix } from "@/lib/workspace/workspace-fix.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { pendingFixId?: string } | null;

  if (!body?.pendingFixId?.trim()) {
    return NextResponse.json({ error: "pendingFixId is required." }, { status: 400 });
  }

  try {
    await rejectPendingFix(body.pendingFixId.trim());
    return NextResponse.json({
      product: "BootRise",
      phase: 2,
      status: "rejected",
      nextAction: "Adjust your fix request and run Fix and report again."
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reject failed." },
      { status: 502 }
    );
  }
}
