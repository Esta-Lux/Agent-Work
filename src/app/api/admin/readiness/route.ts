import { NextResponse } from "next/server";
import { getProductionReadinessReport } from "@/lib/admin/readiness";

export async function GET() {
  return NextResponse.json({
    product: "BootRise",
    report: getProductionReadinessReport()
  });
}
