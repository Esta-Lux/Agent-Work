import { updateAdminBuildMission } from "@/lib/admin-build/admin-build-store";
import type { AdminBuildMission } from "@/lib/admin-build/types";
import { getSelfAgentPreview } from "@/lib/agents/admin/self-agent-preview-store";
import { createDraftPullRequest } from "@/lib/workspace/github-pr";
import { pushFilesToGithub } from "@/lib/workspace/github-push";
import { resolveGithubApiToken } from "@/lib/github/github-api-auth";

export async function runSelfAgentPrAgent(input: {
  mission: AdminBuildMission;
  missionId: string;
  branchName: string;
  title: string;
  remoteUrl: string;
  baseBranch: string;
  userId: string;
}): Promise<{
  mission: AdminBuildMission;
  draftPr: {
    mode: "draft_pr" | "compare_link";
    title: string;
    branch: string;
    remoteUrl: string;
    prUrl: string;
    compareUrl?: string;
  };
}> {
  const preview = getSelfAgentPreview(input.missionId);
  if (!preview) {
    throw new Error("Patch preview not found for mission.");
  }

  const sanitizedRemote = input.remoteUrl.replace(/\.git$/i, "").replace(/\/+$/, "");
  const compareUrl = `${sanitizedRemote}/compare/${encodeURIComponent(input.baseBranch)}...${encodeURIComponent(input.branchName)}?expand=1`;
  const credentials = await resolveGithubApiToken();

  if (!credentials) {
    const mission = updateAdminBuildMission(
      input.mission.id,
      { status: "pr_opened", branchName: input.branchName, prUrl: compareUrl },
      input.userId
    ) ?? input.mission;
    return {
      mission,
      draftPr: {
        mode: "compare_link",
        title: input.title,
        branch: input.branchName,
        remoteUrl: input.remoteUrl,
        prUrl: compareUrl,
        compareUrl
      }
    };
  }

  const files = preview.patches.map((patch) => ({ path: patch.path, content: patch.after }));
  if (files.length === 0) {
    throw new Error("No approved self-agent patches to push.");
  }

  const push = await pushFilesToGithub({
    remoteUrl: input.remoteUrl,
    baseBranch: input.baseBranch,
    files,
    onlyPaths: preview.patches.map((patch) => patch.path),
    commitMessage: `BootRise self-agent: ${input.mission.title}`.slice(0, 72)
  });
  const pr = await createDraftPullRequest({
    remoteUrl: input.remoteUrl,
    headBranch: push.branch,
    baseBranch: input.baseBranch,
    title: input.title,
    body: [
      "## BootRise Self-Agent draft PR",
      "",
      `Mission: ${input.mission.title}`,
      "",
      "## Guard results",
      `- QA passed: ${preview.qaPassed ? "yes" : "no"}`,
      `- Blockers: ${preview.blockers.length}`,
      `- Warnings: ${preview.warnings.length}`,
      "",
      "## Verify summary",
      "- Self-agent guard + diff-scope verify route completed before PR request."
    ].join("\n"),
    draft: true
  });

  const mission = updateAdminBuildMission(
    input.mission.id,
    { status: "pr_opened", branchName: push.branch, prUrl: pr.prUrl },
    input.userId
  ) ?? input.mission;

  return {
    mission,
    draftPr: {
      mode: "draft_pr",
      title: input.title,
      branch: push.branch,
      remoteUrl: input.remoteUrl,
      prUrl: pr.prUrl,
      compareUrl: push.compareUrl ?? compareUrl
    }
  };
}
