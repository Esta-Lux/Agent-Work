import { NextResponse } from "next/server";
import { createVectorSyncJob, getInfrastructureStatus } from "@/lib/infrastructure/control-plane";

export async function GET() {
  return NextResponse.json({
    product: "BootRise",
    vectorSyncJobs: getInfrastructureStatus().vectorSyncJobs
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const record = await createVectorSyncJob({
    repositoryId: body.repositoryId ?? "demo",
    trigger: body.trigger
  });

  return NextResponse.json({
    product: "BootRise",
    record
  });
}
