import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { assertKillSwitchAllowed } from "@/lib/admin/kill-switches";
import {
  SELF_REPOSITORY_ID,
  getSelfRepoDefaultBranch,
  getSelfRepoRemoteUrl,
  loadSelfRepoSnapshot,
  syncSelfRepoSnapshot
} from "@/lib/admin/self-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdminAuth(request, async (_user, req) => {
    try {
      assertKillSwitchAllowed("admin_agent");
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Admin agent disabled." },
        { status: 403 }
      );
    }
    const url = new URL(req.url);
    const path = url.searchParams.get("path");
    const refresh = url.searchParams.get("refresh") === "1";

    try {
      if (refresh) {
        syncSelfRepoSnapshot();
      }
      const files = loadSelfRepoSnapshot();

      if (path) {
        const match = files.find((file) => file.path === path);
        if (!match) {
          return NextResponse.json({ error: "File not found in self-repo snapshot." }, { status: 404 });
        }
        return NextResponse.json({
          product: "BootRise",
          repositoryId: SELF_REPOSITORY_ID,
          path: match.path,
          content: match.content,
          sizeBytes: match.sizeBytes ?? match.content.length
        });
      }

      return NextResponse.json({
        product: "BootRise",
        repositoryId: SELF_REPOSITORY_ID,
        remoteUrl: getSelfRepoRemoteUrl(),
        defaultBranch: getSelfRepoDefaultBranch(),
        files: files.map((file) => ({
          path: file.path,
          sizeBytes: file.sizeBytes ?? file.content.length
        }))
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not load self-repo files." },
        { status: 500 }
      );
    }
  });
}
