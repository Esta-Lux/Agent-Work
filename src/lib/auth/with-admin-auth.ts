import { NextResponse } from "next/server";
import { AuthError, type AuthUser } from "@/lib/auth/types";
import { requireAdmin } from "@/lib/auth/admin-auth";

export type AdminHandler = (user: AuthUser, request: Request) => Promise<Response>;

export async function withAdminAuth(request: Request, handler: AdminHandler): Promise<Response> {
  try {
    const user = await requireAdmin();
    return await handler(user, request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
