import { NextResponse } from "next/server";
import { githubAuthStatus } from "@/lib/github/github-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public-safe GitHub integration status (no secrets). */
export async function GET() {
  return NextResponse.json(githubAuthStatus());
}
