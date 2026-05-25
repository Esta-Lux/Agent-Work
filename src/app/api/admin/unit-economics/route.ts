import { NextResponse } from "next/server";
import { getUnitEconomics } from "@/lib/business/unit-economics";

export async function GET() {
  return NextResponse.json({
    product: "BootRise",
    economics: getUnitEconomics()
  });
}
