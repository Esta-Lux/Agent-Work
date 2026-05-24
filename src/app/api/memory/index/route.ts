import { NextResponse } from "next/server";
import { ContextBuilder, recordEpistemicMemory } from "@/lib/memory/context-builder";
import { traceBlastRadius } from "@/lib/memory/blast-radius";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";

interface MemoryIndexRequest {
  repositoryId?: string;
  files?: SourceFileInput[];
  intent?: {
    symbolName: string;
    filePath: string;
    architecturalIntent: string;
    rules?: string[];
    scarTissue?: string[];
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as MemoryIndexRequest | null;
  const repositoryId = body?.repositoryId?.trim() || "demo";
  const files = body?.files;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: "Provide files to index into the Living Ledger." }, { status: 400 });
  }

  const builder = new ContextBuilder(files);
  const symbols = await builder.persistStaticMemory(repositoryId);
  let ledgerEntry = null;
  let blastRadius = null;

  if (body.intent) {
    ledgerEntry = await recordEpistemicMemory({
      repositoryId,
      symbolName: body.intent.symbolName,
      filePath: body.intent.filePath,
      architecturalIntent: body.intent.architecturalIntent,
      rules: body.intent.rules ?? [],
      scarTissue: body.intent.scarTissue ?? []
    });
    blastRadius = await traceBlastRadius(repositoryId, body.intent.symbolName);
  }

  return NextResponse.json({
    product: "BootRise",
    repositoryId,
    symbols,
    ledgerEntry,
    blastRadius,
    nextAction: "Use /api/memory/context or /api/memory/blast-radius before approving a mutation."
  });
}

