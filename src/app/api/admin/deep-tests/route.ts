import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { getDeepTestReport } from "@/lib/admin/deep-tests";

export async function GET(request: Request) {
  return withAdminAuth(request, async () => {
    return NextResponse.json({
      product: "BootRise",
      report: getDeepTestReport()
    });
  });
}
