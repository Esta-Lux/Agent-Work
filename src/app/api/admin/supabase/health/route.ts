import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/db/supabase";

export async function GET() {
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({
      product: "BootRise",
      connected: false,
      reason: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not configured."
    });
  }

  const { error } = await supabase.from("bootrise_symbols").select("id").limit(1);

  return NextResponse.json({
    product: "BootRise",
    connected: !error,
    error: error?.message
  });
}

