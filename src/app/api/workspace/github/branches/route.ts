import { NextResponse } from "next/server";
import { listGithubBranches } from "@/lib/workspace/github-repo-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const remoteUrl = url.searchParams.get("url")?.trim();
  if (!remoteUrl) {
    return NextResponse.json({ error: "url query param is required." }, { status: 400 });
  }

  try {
    const result = await listGithubBranches(remoteUrl);
    return NextResponse.json({ product: "BootRise", ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list branches." },
      { status: 502 }
    );
  }
}
