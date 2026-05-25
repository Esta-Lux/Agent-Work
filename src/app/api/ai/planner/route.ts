import { NextResponse } from "next/server";
import { createOpenAIChangePlan, getOpenAIModel, hasOpenAIKey } from "@/lib/ai/openai-client";
import { demoRepo } from "@/lib/demo/demo-repo";
import { createInitialChangePlan } from "@/lib/planning/planner";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { request?: string } | null;
  const userRequest = body?.request?.trim();

  if (!userRequest) {
    return NextResponse.json({ error: "A non-empty request is required." }, { status: 400 });
  }

  const fallbackPlan = createInitialChangePlan(userRequest, demoRepo);

  if (!hasOpenAIKey()) {
    return NextResponse.json({
      product: "BootRise",
      provider: "OpenAI",
      model: getOpenAIModel(),
      plannerSource: "deterministic-fallback",
      connected: false,
      plan: fallbackPlan,
      message: "OPENAI_API_KEY is not configured; returned deterministic BootRise plan."
    });
  }

  try {
    const result = await createOpenAIChangePlan(userRequest, demoRepo, fallbackPlan);
    return NextResponse.json({
      product: "BootRise",
      provider: "OpenAI",
      plannerSource: "openai",
      connected: true,
      model: result.model,
      plan: result.plan
    });
  } catch (error) {
    return NextResponse.json({
      product: "BootRise",
      provider: "OpenAI",
      plannerSource: "deterministic-fallback",
      connected: false,
      model: getOpenAIModel(),
      plan: fallbackPlan,
      message: error instanceof Error ? error.message : "OpenAI planner failed; returned deterministic BootRise plan."
    });
  }
}
