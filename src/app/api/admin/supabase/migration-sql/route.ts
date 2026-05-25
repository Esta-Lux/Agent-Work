import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const path = join(process.cwd(), "supabase", "migrations", "002_workspace_core.sql");
  const sql = readFileSync(path, "utf8");

  return NextResponse.json({
    product: "BootRise",
    file: "supabase/migrations/002_workspace_core.sql",
    sql
  });
}
