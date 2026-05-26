import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/types";
import { requireUser } from "@/lib/auth/server-auth";

/** Guards legacy /api routes that are not yet on withWorkspaceAuth. */
export async function requireUserForLegacyRoute(): Promise<Response | null> {
  try {
    await requireUser();
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
