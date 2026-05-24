import { NextResponse } from "next/server";
import { ContextBuilder } from "@/lib/memory/context-builder";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";

interface ContextRequest {
  repositoryId?: string;
  files?: SourceFileInput[];
  targetFile?: string;
  symbolName?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ContextRequest | null;

  if (!body?.files || !body.targetFile || !body.symbolName) {
    return NextResponse.json(
      {
        error: "files, targetFile, and symbolName are required."
      },
      { status: 400 }
    );
  }

  const builder = new ContextBuilder(body.files);
  const context = await builder.compileContext(body.repositoryId ?? "demo", body.targetFile, body.symbolName);

  return NextResponse.json({
    product: "BootRise",
    context
  });
}

