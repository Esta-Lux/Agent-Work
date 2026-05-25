import { NextResponse } from "next/server";
import { createRemoteStream, getInfrastructureStatus } from "@/lib/infrastructure/control-plane";

export async function GET() {
  return NextResponse.json({
    product: "BootRise",
    remoteStreams: getInfrastructureStatus().remoteStreams
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const record = await createRemoteStream({
    repositoryId: body.repositoryId ?? "demo",
    runtime: body.runtime,
    transport: body.transport,
    exposedPorts: Array.isArray(body.exposedPorts) ? body.exposedPorts.map(Number) : undefined
  });

  return NextResponse.json({
    product: "BootRise",
    record
  });
}
