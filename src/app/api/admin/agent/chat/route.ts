import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { runAdminAgentChat } from "@/lib/admin/admin-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatBody {
  message?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  provider?: string;
  mode?: string;
  orgId?: string;
}

export async function POST(request: Request) {
  return withAdminAuth(request, async (user, req) => {
    const body = (await req.json().catch(() => null)) as ChatBody | null;
    const message = body?.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "A non-empty message is required." }, { status: 400 });
    }
    try {
      const result = await runAdminAgentChat({
        user,
        orgId: body?.orgId,
        message,
        history: body?.history,
        provider: body?.provider,
        mode: body?.mode
      });
      return NextResponse.json({ product: "BootRise", ...result });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Admin chat failed." },
        { status: 502 }
      );
    }
  });
}
