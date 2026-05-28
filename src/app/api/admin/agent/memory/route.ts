import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { loadCodebaseMemory, refreshCodebaseMemory } from "@/lib/admin/codebase-memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface MemoryBody {
  refresh?: boolean;
}

export async function GET(request: Request) {
  return withAdminAuth(request, async () => {
    try {
      const snapshot = await loadCodebaseMemory();
      return NextResponse.json({ product: "BootRise", snapshot });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to load codebase memory." },
        { status: 502 }
      );
    }
  });
}

export async function POST(request: Request) {
  return withAdminAuth(request, async (_user, req) => {
    const body = (await req.json().catch(() => null)) as MemoryBody | null;
    try {
      const snapshot = body?.refresh ? await refreshCodebaseMemory() : await loadCodebaseMemory();
      return NextResponse.json({ product: "BootRise", snapshot });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to refresh codebase memory." },
        { status: 502 }
      );
    }
  });
}
