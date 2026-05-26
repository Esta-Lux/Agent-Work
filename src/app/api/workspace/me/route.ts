import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { isAdminUser } from "@/lib/auth/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withWorkspaceAuth(request, async (ctx) => {
    const isAdmin = await isAdminUser(ctx.user);
    return NextResponse.json({
      user: { id: ctx.user.id, email: ctx.user.email },
      org: { id: ctx.orgId, name: ctx.orgName, role: ctx.orgRole, isPersonalOrg: ctx.isPersonalOrg },
      isAdmin
    });
  });
}
