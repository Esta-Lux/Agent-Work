import { NextResponse } from "next/server";
import { demoRepo } from "@/lib/demo/demo-repo";
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

  const plan = createInitialChangePlan(userRequest, demoRepo);

  return NextResponse.json({
    product: "VerityOS",
    plan,
    health: createRepoHealthSummary(demoRepo),
    verification: createVerificationSummary(plan),
    nextAction: "Review risk and validation plan before approving execution."
  });
}
