import { parseGithubOwnerRepo } from "@/lib/workspace/github-inspector";
import { resolveGithubApiToken } from "@/lib/github/github-api-auth";
import type { WorkspaceFixReport } from "@/lib/workspace/workspace-types";

export interface DraftPullRequestResult {
  prUrl: string;
  prNumber: number;
  branch: string;
  title: string;
}

async function requireGithubHeaders(): Promise<Record<string, string>> {
  const token = await resolveGithubApiToken();
  if (!token) {
    throw new Error(
      "GitHub credentials required for draft PRs. Set GITHUB_APP_ID + GITHUB_APP_PRIVATE_KEY, or GITHUB_TOKEN in .env.local."
    );
  }
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "BootRise-Workspace"
  };
}

export function buildPullRequestBody(report: WorkspaceFixReport): string {
  const control = report.controlLayer;
  const manifest = control
    ? [
        "## BootRise control layer",
        "",
        `**Scope:** ${control.scopeContract.scopeLockMessage}`,
        "",
        `**Context:** ${control.contextPlan.summary}`,
        "",
        `**Token transparency:** ${control.tokenWaste.message}`,
        "",
        `**Regression:** ${control.regressionGuard.summary}`,
        control.regressionGuard.executedCommands.length > 0
          ? `**Executed checks:**\n${control.regressionGuard.executedCommands.map((c) => `- ${c.label} (exit ${c.exitCode})`).join("\n")}`
          : null,
        "",
        `**Blast radius:** ${report.potentiallyBroken.slice(0, 8).join("; ") || "narrow"}`,
        "",
        `**Rollback:** ${report.plan.rollbackStrategy}`,
        "",
        "### Reviewer checklist",
        ...(report.safeToPr?.checklist ?? ["Confirm scope matches diff", "Run CI", "QA affected flows"]).map(
          (item) => `- ${item}`
        )
      ]
        .filter(Boolean)
        .join("\n")
    : report.plainEnglishSummary ?? "BootRise controlled change.";

  return manifest;
}

export async function createDraftPullRequest(input: {
  remoteUrl: string;
  headBranch: string;
  baseBranch?: string;
  title: string;
  body: string;
  draft?: boolean;
}): Promise<DraftPullRequestResult> {
  const parsed = parseGithubOwnerRepo(input.remoteUrl);
  if (!parsed) throw new Error("Invalid GitHub URL.");

  const headers = await requireGithubHeaders();
  const owner = parsed.owner;
  const repo = parsed.repo;

  const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!metaRes.ok) throw new Error(`GitHub repo lookup failed (${metaRes.status}).`);
  const meta = (await metaRes.json()) as { default_branch?: string };
  const base = input.baseBranch ?? meta.default_branch ?? "main";

  const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      head: input.headBranch,
      base,
      body: input.body,
      draft: input.draft ?? true
    })
  });

  if (!prRes.ok) {
    const text = await prRes.text();
    throw new Error(`Could not create pull request (${prRes.status}): ${text.slice(0, 240)}`);
  }

  const pr = (await prRes.json()) as { html_url?: string; number?: number };
  if (!pr.html_url || !pr.number) throw new Error("GitHub PR response missing url/number.");

  return {
    prUrl: pr.html_url,
    prNumber: pr.number,
    branch: input.headBranch,
    title: input.title
  };
}
