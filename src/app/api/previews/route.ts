import { NextResponse } from "next/server";
import { buildPreviewProject } from "@/lib/execution/preview-builder";
import { memoryStore } from "@/lib/persistence/memory-store";

export async function GET() {
  return NextResponse.json({
    product: "BootRise",
    previews: memoryStore.previews
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { planId?: string } | null;
  const planId = body?.planId;

  if (!planId) {
    return NextResponse.json({ error: "planId is required." }, { status: 400 });
  }

  const record = memoryStore.plans.find((plan) => plan.id === planId);
  if (!record) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  return NextResponse.json({
    product: "BootRise",
    preview: buildPreviewProject(record.plan)
  });
}

