import { NextResponse } from "next/server";
import { recordDynamicPulse } from "@/lib/memory/run-history";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    repositoryId?: string;
    source?: "terminal" | "test" | "runtime" | "database" | "network";
    severity?: "info" | "warning" | "error";
    summary?: string;
    rawPayload?: Record<string, unknown>;
  } | null;

  if (!body?.summary) {
    return NextResponse.json({ error: "summary is required." }, { status: 400 });
  }

  const pulse = await recordDynamicPulse({
    repositoryId: body.repositoryId ?? "demo",
    source: body.source ?? "runtime",
    severity: body.severity ?? "info",
    summary: body.summary,
    rawPayload: body.rawPayload ?? {}
  });

  return NextResponse.json({
    product: "BootRise",
    pulse
  });
}

