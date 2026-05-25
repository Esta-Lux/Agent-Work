import { NextResponse } from "next/server";
import { getInfrastructureStatus, upsertSandboxPool } from "@/lib/infrastructure/control-plane";

export async function GET() {
  return NextResponse.json({
    product: "BootRise",
    sandboxPools: getInfrastructureStatus().sandboxPools
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const record = await upsertSandboxPool({
    id: body.id,
    provider: body.provider,
    region: body.region,
    status: body.status,
    activeSandboxes: Number(body.activeSandboxes ?? 0),
    queuedJobs: Number(body.queuedJobs ?? 0),
    maxSandboxes: Number(body.maxSandboxes ?? 4),
    averageBootMs: Number(body.averageBootMs ?? 1500)
  });

  return NextResponse.json({
    product: "BootRise",
    record
  });
}
