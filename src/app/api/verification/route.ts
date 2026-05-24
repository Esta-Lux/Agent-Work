import { NextResponse } from "next/server";
import { demoPlan } from "@/lib/demo/demo-repo";
import { memoryStore, upsertRecord } from "@/lib/persistence/memory-store";
import { runVerificationChecks } from "@/lib/verification/verification-runner";
import { createVerificationSummary } from "@/lib/verification/verification-summary";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    product: "BootRise",
    verification: createVerificationSummary(demoPlan),
    nextAction: "Run commands, attach results, and block execution if required checks fail."
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { planId?: string } | null;
  const plan = body?.planId ? memoryStore.plans.find((record) => record.id === body.planId)?.plan : demoPlan;

  if (!plan) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  const run = await runVerificationChecks(plan.validations);
  const now = new Date().toISOString();

  upsertRecord(memoryStore.verifications, {
    id: `verification_run_${plan.id}`,
    planId: plan.id,
    checks: run.checks,
    createdAt: now
  });

  return NextResponse.json({
    product: "BootRise",
    verification: createVerificationSummary({
      ...plan,
      validations: run.checks
    }),
    output: run.output
  });
}
