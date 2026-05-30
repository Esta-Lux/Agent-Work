import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { NextResponse } from "next/server";
import { createAdminBuildMission, updateAdminBuildMission } from "@/lib/admin-build/admin-build-store";
import {
  buildSelfAgentMission,
  createSelfAgentScopePreview,
  isProtectedSelfAgentBranch,
  type SelfAgentRepoFile
} from "@/lib/agents/admin/self-agent-architect";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";

export const runtime = "nodejs";

interface PlanRequestBody {
  mission?: {
    title?: string;
    description?: string;
    targetBranch?: string;
  };
  repoFiles?: SelfAgentRepoFile[];
}

export async function POST(request: Request) {
  return withAdminAuth(request, async (user, req) => {
    const body = (await req.json().catch(() => null)) as PlanRequestBody | null;
    const missionInput = body?.mission;
    const title = missionInput?.title?.trim() ?? "";
    const description = missionInput?.description?.trim() ?? "";
    const targetBranch = missionInput?.targetBranch?.trim() ?? "";

    if (!title || !description || !targetBranch) {
      return NextResponse.json({ error: "Mission title, description, and target branch are required." }, { status: 400 });
    }

    if (isProtectedSelfAgentBranch(targetBranch)) {
      return NextResponse.json(
        { error: "Direct main/master branch mutation is blocked. Use a feature branch for self-agent work." },
        { status: 400 }
      );
    }

    const repoFiles = Array.isArray(body?.repoFiles) && body.repoFiles.length > 0 ? body.repoFiles : loadBootRiseRepoManifest();

    try {
      const buildMission = createAdminBuildMission(
        {
          title,
          targetSurface: "admin_console",
          objective: description,
          affectedFiles: [],
          forbiddenFiles: [
            "src/lib/auth/**",
            "src/app/api/auth/**",
            "supabase/migrations/**",
            "src/lib/ai/model-router.ts",
            "src/lib/admin/kill-switches.ts"
          ],
          acceptanceCriteria: [
            "src/components/admin/self-agent-page.tsx shows a scope preview before execution.",
            "src/app/api/admin/self-agent/plan/route.ts rejects protected branch names.",
            "src/lib/agents/admin/self-agent-architect.ts returns exact target and read-only files."
          ],
          riskLevel: "medium",
          generatedFrom: "manual"
        },
        user.id
      );

      const mission = buildSelfAgentMission({ mission: buildMission, targetBranch });
      const scope = createSelfAgentScopePreview({
        missionId: buildMission.id,
        title,
        description,
        repoFiles
      });

      const updatedMission = updateAdminBuildMission(
        buildMission.id,
        {
          status: "scoped",
          branchName: targetBranch,
          affectedFiles: [...new Set(scope.workUnits.flatMap((unit) => unit.targetFiles))],
          riskLevel: scope.estimatedRiskLevel,
          scopeContract: {
            summary: scope.scopeSummary,
            filesInScope: [...new Set(scope.workUnits.flatMap((unit) => unit.targetFiles))],
            filesOutOfScope: [...new Set(scope.workUnits.flatMap((unit) => unit.readOnlyFiles))],
            assumptions: [
              "Scope planning does not generate patches.",
              "Self-agent execution must stay on a non-main feature branch.",
              "Admin approval remains required before later execution stages."
            ],
            estimatedComplexity: scope.workUnits.length > 2 ? "complex" : scope.workUnits.length === 2 ? "moderate" : "simple",
            estimatedFiles: scope.totalFilesAffected
          }
        },
        user.id
      );

      return NextResponse.json({ mission, scope, adminBuildMission: updatedMission ?? buildMission }, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Self-agent scope planning failed." },
        { status: 400 }
      );
    }
  });
}

function loadBootRiseRepoManifest(): SelfAgentRepoFile[] {
  const root = process.cwd();
  const srcRoot = resolve(root, "src");
  if (!existsSync(srcRoot)) return [];
  const files: SelfAgentRepoFile[] = [];
  walk(srcRoot, files, root);
  return files.slice(0, 600);
}

function walk(dir: string, output: SelfAgentRepoFile[], root: string): void {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const absolute = join(dir, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      walk(absolute, output, root);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx|css|json|md)$/.test(entry) || stats.size > 120_000) continue;
    const path = relative(root, absolute).replace(/\\/g, "/");
    output.push({ path, content: readFileSync(absolute, "utf8") });
  }
}
