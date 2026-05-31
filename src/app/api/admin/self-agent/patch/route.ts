import { NextResponse } from "next/server";
import { updateAdminBuildMission } from "@/lib/admin-build/admin-build-store";
import { createSelfAgentScopePreview } from "@/lib/agents/admin/self-agent-architect";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { validateSelfAgentBoundary } from "@/lib/agents/admin/self-agent-boundary";
import { validateSelfAgentPatch, type SelfAgentPatchValidation } from "@/lib/agents/admin/self-agent-control-bridge";
import { runSelfAgentBuilder } from "@/lib/agents/admin/self-agent-builder";
import { saveSelfAgentPreview } from "@/lib/agents/admin/self-agent-preview-store";
import { runSelfAgentQa } from "@/lib/agents/admin/self-agent-qa";
import { DEFAULT_ORG_ID } from "@/lib/tenancy/org-context";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export type { SelfAgentPatchValidation };

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withAdminAuth(request, async (user) => {
    const body = (await request.json().catch(() => null)) as { missionId?: string; branchName?: string; provider?: string } | null;
    const boundary = validateSelfAgentBoundary({ missionId: body?.missionId, branchName: body?.branchName });

    if (!boundary.ok) {
      return NextResponse.json({ error: boundary.message }, { status: boundary.status });
    }

    const mission = boundary.mission;
    if (!mission) {
      return NextResponse.json({ error: "Mission not found." }, { status: 404 });
    }

    const repoFiles = loadBootRiseRepoManifest();
    const scope = createSelfAgentScopePreview({
      missionId: mission.id,
      title: mission.title,
      description: mission.objective,
      repoFiles
    });
    const preview = await runSelfAgentBuilder({
      missionId: mission.id,
      workUnits: scope.workUnits,
      user,
      orgId: DEFAULT_ORG_ID,
      provider: body?.provider
    });

    const validations: SelfAgentPatchValidation[] = scope.workUnits.map((workUnit) =>
      validateSelfAgentPatch({
        missionId: mission.id,
        workUnit,
        patchedFiles: preview.patches.filter((patch) => workUnit.targetFiles.includes(patch.path)).map((patch) => ({ path: patch.path, before: patch.before, after: patch.after })),
        repoFiles,
        envExampleContent: repoFiles.find((file) => /\.env\.example$/i.test(file.path))?.content ?? ""
      })
    );
    const qa = runSelfAgentQa({ missionId: mission.id, validations });
    saveSelfAgentPreview({
      missionId: mission.id,
      branchName: body?.branchName?.trim() || mission.branchName || "bootrise/self-agent-draft",
      patches: preview.patches,
      blockers: qa.blockers,
      warnings: [...preview.warnings, ...qa.warnings],
      validations,
      qaPassed: qa.passed
    });

    updateAdminBuildMission(
      mission.id,
      {
        status: qa.passed ? "pending_approval" : "guard_check",
        patchPreviewId: `sap_${Date.now()}`,
        guardResults: {
          passed: qa.passed,
          timestamp: new Date().toISOString(),
          checks: [
            {
              name: "Self-Agent control bridge",
              passed: qa.passed,
              message: qa.blockers[0] ?? qa.warnings[0],
              severity: qa.passed ? "info" : "error"
            }
          ]
        }
      },
      user.id
    );

    return NextResponse.json({
      mission,
      scope,
      patchPreview: preview,
      validations,
      qa
    });
  });
}

function loadBootRiseRepoManifest(): Array<{ path: string; content: string }> {
  const root = process.cwd();
  const srcRoot = resolve(root, "src");
  if (!existsSync(srcRoot)) return [];
  const files: Array<{ path: string; content: string }> = [];
  walk(srcRoot, files, root);
  return files.slice(0, 800);
}

function walk(dir: string, output: Array<{ path: string; content: string }>, root: string): void {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const absolute = join(dir, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      walk(absolute, output, root);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx|json|md|css)$/.test(entry) || stats.size > 200_000) continue;
    output.push({ path: relative(root, absolute).replace(/\\/g, "/"), content: readFileSync(absolute, "utf8") });
  }
}
