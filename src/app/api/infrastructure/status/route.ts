import { NextResponse } from "next/server";
import { getInfrastructureStatus } from "@/lib/infrastructure/control-plane";

export async function GET() {
  return NextResponse.json({
    product: "BootRise",
    controlPlane: getInfrastructureStatus()
  });
}
