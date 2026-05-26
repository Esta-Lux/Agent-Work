import { NextResponse } from "next/server";
import { getDevPreviewSession } from "@/lib/workspace/preview-dev-runner";
import { readPreviewFile } from "@/lib/workspace/workspace-preview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2"
};

export async function GET(
  request: Request,
  context: { params: { sessionId: string; path?: string[] } }
) {
  const sessionId = context.params.sessionId;
  const segments = context.params.path ?? [];
  const relativePath = segments.length ? segments.join("/") : "";
  const dev = getDevPreviewSession(sessionId);

  if (dev?.status === "ready" && dev.port) {
    const incoming = new URL(request.url);
    const targetPath = relativePath || "";
    const target = `http://127.0.0.1:${dev.port}/${targetPath}${incoming.search}`;

    try {
      const upstream = await fetch(target, {
        headers: { Accept: request.headers.get("accept") ?? "*/*" },
        signal: AbortSignal.timeout(15_000)
      });

      const headers = new Headers();
      const contentType = upstream.headers.get("content-type");
      if (contentType) headers.set("Content-Type", contentType);
      headers.set("Cache-Control", "no-store");

      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers
      });
    } catch {
      /* fall through to static */
    }
  }

  const staticPath = relativePath || "index.html";
  const content = readPreviewFile(sessionId, staticPath);
  if (content == null) {
    return NextResponse.json(
      {
        error: "Preview not ready.",
        devStatus: dev?.status ?? "unknown",
        hint: dev?.status === "installing" ? "npm install running — retry in a few seconds." : undefined
      },
      { status: 404 }
    );
  }

  const ext = staticPath.includes(".") ? staticPath.slice(staticPath.lastIndexOf(".")) : ".html";
  const type = MIME[ext] ?? "text/plain; charset=utf-8";

  return new NextResponse(content, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "no-store"
    }
  });
}
