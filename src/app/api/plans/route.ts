import { NextResponse } from "next/server";
import { createOpenAIChangePlan, getOpenAIModel, hasOpenAIKey } from "@/lib/ai/openai-client";
import { demoRepo } from "@/lib/demo/demo-repo";
import { memoryStore, upsertRecord } from "@/lib/persistence/memory-store";
import { createInitialChangePlan } from "@/lib/planning/planner";
import { createRepoHealthSummary } from "@/lib/reporting/repo-health";
import { createVerificationSummary } from "@/lib/verification/verification-summary";

export async function GET() {
  return NextResponse.json({
    example: {
      method: "POST",
      path: "/api/plans",
      body: {
        request: "Add organization permissions"
      }
    }
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { request?: string } | null;
  const userRequest = body?.request?.trim();

  if (!userRequest) {
    return NextResponse.json(
      {
        error: "A non-empty request is required."
      },
      { status: 400 }
    );
  }

  const fallbackPlan = createInitialChangePlan(userRequest, demoRepo);
  let plan = fallbackPlan;
  let plannerSource: "openai" | "deterministic-fallback" = "deterministic-fallback";
  let plannerMessage = hasOpenAIKey()
    ? "OpenAI planner was unavailable; deterministic planner produced the plan."
    : "OPENAI_API_KEY is not configured; deterministic planner produced the plan.";

  if (hasOpenAIKey()) {
    try {
      const aiPlan = await createOpenAIChangePlan(userRequest, demoRepo, fallbackPlan);
      plan = aiPlan.plan;
      plannerSource = "openai";
      plannerMessage = `Plan generated with OpenAI ${aiPlan.model}.`;
    } catch (error) {
      plannerMessage = error instanceof Error ? error.message : plannerMessage;
    }
  }

  const now = new Date().toISOString();

  upsertRecord(memoryStore.plans, {
    id: plan.id,
    repositoryId: "demo",
    plan,
    status: "draft",
    createdAt: now
  });

  upsertRecord(memoryStore.verifications, {
    id: `verification_${plan.id}`,
    planId: plan.id,
    checks: plan.validations,
    createdAt: now
  });

  return NextResponse.json({
    product: "BootRise",
    plannerSource,
    model: plannerSource === "openai" ? getOpenAIModel() : null,
    plannerMessage,
    plan,
    health: createRepoHealthSummary(demoRepo),
    verification: createVerificationSummary(plan),
    nextAction: "Review risk and validation plan before approving execution."
  });
}
