import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const dir = join(process.cwd(), "supabase", "migrations");
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const parts = files.map((name) => {
    const sql = readFileSync(join(dir, name), "utf8");
    return `-- ═══ ${name} ═══\n${sql}`;
  });

  return NextResponse.json({
    product: "BootRise",
    files,
    sql: parts.join("\n\n")
  });
}
