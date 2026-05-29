import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { runUserWorkspaceHealthAgent } from "@/lib/agents/admin/user-workspace-health-agent";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAdminAuth(request, async () => {
    const report = runUserWorkspaceHealthAgent();
    return NextResponse.json({ product: "BootRise", report });
  });
}
