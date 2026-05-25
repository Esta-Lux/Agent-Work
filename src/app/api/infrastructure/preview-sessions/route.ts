import { NextResponse } from "next/server";
import { createPreviewSession, getInfrastructureStatus } from "@/lib/infrastructure/control-plane";

export async function GET() {
  return NextResponse.json({
    product: "BootRise",
    previewSessions: getInfrastructureStatus().previewSessions
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const record = await createPreviewSession({
    repositoryId: body.repositoryId ?? "demo",
    mode: body.mode,
    framework: body.framework
  });

  return NextResponse.json({
    product: "BootRise",
    record
  });
}
