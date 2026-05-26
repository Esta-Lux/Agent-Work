import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { getUnitEconomics } from "@/lib/business/unit-economics";

export async function GET(request: Request) {
  return withAdminAuth(request, async () => {
    return NextResponse.json({
      product: "BootRise",
      economics: getUnitEconomics()
    });
  });
}
