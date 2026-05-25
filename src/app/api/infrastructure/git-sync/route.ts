import { NextResponse } from "next/server";
import { createGitSync, getInfrastructureStatus } from "@/lib/infrastructure/control-plane";

export async function GET() {
  return NextResponse.json({
    product: "BootRise",
    gitSyncs: getInfrastructureStatus().gitSyncs
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const record = await createGitSync({
    repositoryId: body.repositoryId ?? "demo",
    remoteUrl: body.remoteUrl,
    defaultBranch: body.defaultBranch
  });

  return NextResponse.json({
    product: "BootRise",
    record
  });
}
