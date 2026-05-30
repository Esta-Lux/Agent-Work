import { NextResponse } from "next/server";
import { createDefaultOnboardingState, type OnboardingState } from "@/lib/onboarding/onboarding-state";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";

export const runtime = "nodejs";

const stateByOrg = new Map<string, OnboardingState>();

export async function GET(request: Request) {
  return withWorkspaceAuth(request, async (ctx) => {
    return NextResponse.json({ state: stateByOrg.get(ctx.orgId) ?? createDefaultOnboardingState() });
  });
}

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as Partial<OnboardingState> | null;
    const current = stateByOrg.get(ctx.orgId) ?? createDefaultOnboardingState();
    const next: OnboardingState = {
      dismissed: body?.dismissed ?? current.dismissed,
      currentStep: body?.currentStep ?? current.currentStep,
      completedSteps: body?.completedSteps ?? current.completedSteps
    };
    stateByOrg.set(ctx.orgId, next);
    return NextResponse.json({ state: next });
  });
}
