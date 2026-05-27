import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { assertCreditsAvailable, chargeCredits } from "@/lib/usage/credit-store";
import { estimateCreditsForAction } from "@/lib/usage/credit-pricing";
import { runSecurityScanFull } from "@/lib/security/security-scan";
import { appendLedgerEvent } from "@/lib/workspace/living-ledger-timeline";
import { addArchitectureMemory } from "@/lib/project-brain/memory-updater";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as {
      files?: SourceFileInput[];
      projectId?: string;
    } | null;
    if (!body?.files?.length) {
      return NextResponse.json({ error: "files required." }, { status: 400 });
    }
    const action = "basic_security_scan";
    const estimatedCredits = estimateCreditsForAction(action);
    await assertCreditsAvailable(ctx.orgId, action, estimatedCredits);
    const { findings, score, semgrep } = await runSecurityScanFull(body.files);
    const criticalCount = findings.filter((f) => f.severity === "critical" || f.blocksDeployment).length;
    if (body.projectId) {
      void appendLedgerEvent(
        body.projectId,
        {
          kind: "security_scan",
          title: "Security scan completed",
          narrative: `${findings.length} findings (${criticalCount} critical), score ${score}`
        },
        ctx.orgId
      );
      for (const f of findings.filter((x) => x.severity === "critical" || x.severity === "high").slice(0, 5)) {
        void addArchitectureMemory({
          orgId: ctx.orgId,
          projectId: body.projectId,
          title: `Security: ${f.title}`,
          content: `${f.whyItMatters} Fix: ${f.recommendedFix}`,
          type: "rule",
          relatedPaths: f.file ? [f.file] : []
        }).catch(() => {});
      }
    }
    void chargeCredits({
      orgId: ctx.orgId,
      userId: ctx.user.id,
      action,
      credits: estimatedCredits,
      metadata: { taskType: action, projectId: body.files[0]?.path }
    });
    return NextResponse.json({
      product: "BootRise",
      findings,
      criticalCount,
      score,
      estimatedCredits,
      semgrep
    });
  });
}
