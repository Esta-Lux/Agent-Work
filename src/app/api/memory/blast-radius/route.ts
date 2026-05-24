import { NextResponse } from "next/server";
import { traceBlastRadius } from "@/lib/memory/blast-radius";

interface BlastRadiusRequest {
  repositoryId?: string;
  symbolName?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as BlastRadiusRequest | null;
  const symbolName = body?.symbolName?.trim();

  if (!symbolName) {
    return NextResponse.json({ error: "symbolName is required." }, { status: 400 });
  }

  const result = await traceBlastRadius(body?.repositoryId ?? "demo", symbolName);

  return NextResponse.json({
    product: "VerityOS",
    result
  });
}

