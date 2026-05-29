import { getSupabaseHealthReport } from "@/lib/db/supabase-health";

export async function runPlatformHealthAgent() {
  return getSupabaseHealthReport();
}
