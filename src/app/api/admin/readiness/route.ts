import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { getProductionReadinessReport } from "@/lib/admin/readiness";

export async function GET(request: Request) {
  return withAdminAuth(request, async () => {
    return NextResponse.json({
      product: "BootRise",
      report: await getProductionReadinessReport()
    });
  });
}
