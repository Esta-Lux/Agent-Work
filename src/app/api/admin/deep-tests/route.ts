import { NextResponse } from "next/server";
import { getDeepTestReport } from "@/lib/admin/deep-tests";

export async function GET() {
  return NextResponse.json({
    product: "BootRise",
    report: getDeepTestReport()
  });
}
