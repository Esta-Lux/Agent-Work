import { NextResponse } from "next/server";
import { getDevPreviewSession } from "@/lib/workspace/preview-dev-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId")?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const session = getDevPreviewSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Dev preview session not found." }, { status: 404 });
  }

  return NextResponse.json({
    product: "BootRise",
    session
  });
}
