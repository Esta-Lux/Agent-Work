import { NextResponse } from "next/server";
import { memoryStore } from "@/lib/persistence/memory-store";

interface PlanActionBody {
  status?: "approved" | "rejected";
}

export async function GET(_request: Request, context: { params: { planId: string } }) {
  const record = memoryStore.plans.find((plan) => plan.id === context.params.planId);

  if (!record) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  return NextResponse.json({
    product: "VerityOS",
    record
  });
}

export async function PATCH(request: Request, context: { params: { planId: string } }) {
  const body = (await request.json().catch(() => null)) as PlanActionBody | null;
  const record = memoryStore.plans.find((plan) => plan.id === context.params.planId);

  if (!record) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  if (body?.status !== "approved" && body?.status !== "rejected") {
    return NextResponse.json({ error: "Status must be approved or rejected." }, { status: 400 });
  }

  record.status = body.status;

  return NextResponse.json({
    product: "VerityOS",
    record,
    nextAction: body.status === "approved" ? "Generate diff preview before execution." : "Plan rejected. No edits will run."
  });
}

