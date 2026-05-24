import { NextResponse } from "next/server";
import { demoPlan } from "@/lib/demo/demo-repo";
import { createVerificationSummary } from "@/lib/verification/verification-summary";

export async function GET() {
  return NextResponse.json({
    product: "VerityOS",
    verification: createVerificationSummary(demoPlan),
    nextAction: "Run commands, attach results, and block execution if required checks fail."
  });
}

