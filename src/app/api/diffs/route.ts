import { NextResponse } from "next/server";
import { createDiffPreview } from "@/lib/execution/diff-preview";
import { memoryStore, upsertRecord } from "@/lib/persistence/memory-store";

interface DiffRequestBody {
  planId?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as DiffRequestBody | null;
  const planId = body?.planId;

  if (!planId) {
    return NextResponse.json({ error: "planId is required." }, { status: 400 });
  }

  const record = memoryStore.plans.find((plan) => plan.id === planId);
  if (!record) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  const preview = createDiffPreview(record.plan);
  const now = new Date().toISOString();

  upsertRecord(memoryStore.diffs, {
    id: `diff_${planId}`,
    planId,
    preview,
    createdAt: now
  });

  return NextResponse.json({
    product: "VerityOS",
    preview,
    nextAction: "Approve execution only after reviewing generated files."
  });
}

