import { NextResponse } from "next/server";
import { getGithubAppReadiness } from "@/lib/github/github-app-readiness";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAdminAuth(request, async () => NextResponse.json({ readiness: getGithubAppReadiness() }));
}
