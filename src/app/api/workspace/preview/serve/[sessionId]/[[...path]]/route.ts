import { NextResponse } from "next/server";
import { readPreviewFile } from "@/lib/workspace/workspace-preview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

export async function GET(
  _request: Request,
  context: { params: { sessionId: string; path?: string[] } }
) {
  const sessionId = context.params.sessionId;
  const segments = context.params.path ?? [];
  const relativePath = segments.length ? segments.join("/") : "index.html";

  const content = readPreviewFile(sessionId, relativePath);
  if (content == null) {
    return NextResponse.json({ error: "Preview file not found." }, { status: 404 });
  }

  const ext = relativePath.includes(".") ? relativePath.slice(relativePath.lastIndexOf(".")) : ".html";
  const type = MIME[ext] ?? "text/plain; charset=utf-8";

  if (ext === ".html" || ext === ".css" || ext === ".js") {
    return new NextResponse(content, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "no-store"
      }
    });
  }

  return new NextResponse(content, { headers: { "Content-Type": type } });
}
