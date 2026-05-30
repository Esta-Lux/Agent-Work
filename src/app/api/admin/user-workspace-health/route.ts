import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { runUserWorkspaceHealthAgent, runUserWorkspaceSyntheticChecks } from "@/lib/agents/admin/user-workspace-health-agent";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAdminAuth(request, async (_user, req) => {
    const report = runUserWorkspaceHealthAgent();
    const { searchParams, origin } = new URL(req.url);
    if (searchParams.get("synthetic") === "true") {
      report.syntheticChecks = await runUserWorkspaceSyntheticChecks({
        origin,
        cookie: req.headers.get("cookie")
      });
    }
    return NextResponse.json({ product: "BootRise", report });
  });
}
