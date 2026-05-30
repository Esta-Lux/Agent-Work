import { NextResponse } from "next/server";
import { listAdminBuildMissions } from "@/lib/admin-build/admin-build-store";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAdminAuth(request, async (_user, req) => {
    const { searchParams } = new URL(req.url);
    const limit = Number.parseInt(searchParams.get("limit") ?? "20", 10);
    const missions = listAdminBuildMissions({ limit: Number.isFinite(limit) ? limit : 20 }).filter(
      (mission) => mission.branchName?.startsWith("bootrise/self-agent") || mission.generatedFrom === "manual"
    );

    return NextResponse.json({ missions });
  });
}
