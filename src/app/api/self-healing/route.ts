import { NextResponse } from "next/server";
import { createSelfHealingAttempt } from "@/lib/engine/self-healing";
import { memoryStore } from "@/lib/persistence/memory-store";

export async function GET() {
  return NextResponse.json({
    product: "BootRise",
    attempts: memoryStore.selfHealingAttempts
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { runId?: string } | null;
  const run = memoryStore.sandboxRuns.find((candidate) => candidate.id === body?.runId);

  if (!run) {
    return NextResponse.json({ error: "runId was not found." }, { status: 404 });
  }

  const attempt = await createSelfHealingAttempt(run);

  return NextResponse.json({
    product: "BootRise",
    attempt
  });
}

