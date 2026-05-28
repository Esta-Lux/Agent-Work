import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { runAdminAgentPush } from "@/lib/admin/admin-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PushBody {
  pendingFixId?: string;
  remoteUrl?: string;
  branch?: string;
  commitMessage?: string;
  confirmPushToMain?: boolean;
  confirmationPhrase?: string;
  orgId?: string;
}

export async function POST(request: Request) {
  return withAdminAuth(request, async (user, req) => {
    const body = (await req.json().catch(() => null)) as PushBody | null;
    const pendingFixId = body?.pendingFixId?.trim();
    if (!pendingFixId) {
      return NextResponse.json({ error: "pendingFixId is required." }, { status: 400 });
    }
    try {
      const result = await runAdminAgentPush({
        user,
        orgId: body?.orgId,
        pendingFixId,
        remoteUrl: body?.remoteUrl,
        branch: body?.branch,
        commitMessage: body?.commitMessage,
        confirmPushToMain: body?.confirmPushToMain,
        confirmationPhrase: body?.confirmationPhrase
      });
      return NextResponse.json({ product: "BootRise", ...result });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Admin push failed." },
        { status: 502 }
      );
    }
  });
}
