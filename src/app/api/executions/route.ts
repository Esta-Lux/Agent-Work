import { NextResponse } from "next/server";
import { createDryRunExecutionResult } from "@/lib/execution/executor";
import { buildPreviewProject } from "@/lib/execution/preview-builder";
import { memoryStore, upsertRecord } from "@/lib/persistence/memory-store";

interface ExecutionRequestBody {
  planId?: string;
  approved?: boolean;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ExecutionRequestBody | null;
  const planId = body?.planId;

  if (!planId) {
    return NextResponse.json({ error: "planId is required." }, { status: 400 });
  }

  if (!body?.approved) {
    return NextResponse.json({ error: "Execution requires explicit approval." }, { status: 403 });
  }

  const record = memoryStore.plans.find((plan) => plan.id === planId);
  if (!record) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  if (record.status !== "approved") {
    return NextResponse.json({ error: "Plan must be approved before execution." }, { status: 409 });
  }

  const result = createDryRunExecutionResult(record.plan);
  const preview = buildPreviewProject(record.plan);
  const now = new Date().toISOString();
  record.status = "executed";

  upsertRecord(memoryStore.executions, {
    id: `execution_${planId}`,
    planId,
    result,
    createdAt: now
  });

  upsertRecord(memoryStore.previews, {
    id: preview.id,
    planId,
    preview,
    createdAt: now
  });

  return NextResponse.json({
    product: "VerityOS",
    result,
    preview,
    nextAction: "Run verification evidence before treating this as release-ready."
  });
}

