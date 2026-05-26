import { NextResponse } from "next/server";
import { AuthError, type UserOrgContext } from "@/lib/auth/types";
import { resolveUserOrgContext } from "@/lib/auth/org-auth";

export type WorkspaceHandler = (ctx: UserOrgContext, request: Request) => Promise<Response>;

export async function withWorkspaceAuth(request: Request, handler: WorkspaceHandler): Promise<Response> {
  try {
    const url = new URL(request.url);
    // orgId query param and x-bootrise-org-id are hints only — never trusted without membership check.
    const orgHint = url.searchParams.get("orgId") ?? request.headers.get("x-bootrise-org-id");
    const ctx = await resolveUserOrgContext(orgHint);
    return await handler(ctx, request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
