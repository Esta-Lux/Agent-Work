import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { parseGithubOwnerRepo } from "@/lib/workspace/github-inspector";
import { resolveGithubApiToken } from "@/lib/github/github-api-auth";

export interface GithubPushResult {
  branch: string;
  pushed: string[];
  skipped: string[];
  compareUrl: string | null;
  pullRequestHint: string;
}

const MAX_FILES_PER_PUSH = Number(process.env.BOOTRISE_GITHUB_PUSH_MAX_FILES ?? "500");
const INLINE_BLOB_MAX = 900_000;

async function requireGithubHeaders(): Promise<Record<string, string>> {
  const token = await resolveGithubApiToken();
  if (!token) {
    throw new Error(
      "GitHub credentials required for push. Set GITHUB_APP_CLIENT_ID (or GITHUB_APP_ID) + GITHUB_APP_PRIVATE_KEY (and install the app), or GITHUB_TOKEN in .env.local."
    );
  }
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "BootRise-Workspace"
  };
}

export async function pushFilesToGithub(input: {
  remoteUrl: string;
  baseBranch: string;
  files: SourceFileInput[];
  onlyPaths?: string[];
  commitMessage: string;
}): Promise<GithubPushResult> {
  const parsed = parseGithubOwnerRepo(input.remoteUrl);
  if (!parsed) throw new Error("Invalid GitHub URL.");

  const headers = await requireGithubHeaders();
  const owner = parsed.owner;
  const repo = parsed.repo;
  const baseBranch = input.baseBranch || "main";

  const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!metaRes.ok) throw new Error(`GitHub repo lookup failed (${metaRes.status}).`);
  const meta = (await metaRes.json()) as { default_branch?: string };
  const defaultBranch = meta.default_branch ?? baseBranch;

  const refRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(defaultBranch)}`,
    { headers }
  );
  if (!refRes.ok) throw new Error(`Could not read base branch ${defaultBranch}.`);
  const refJson = (await refRes.json()) as { object?: { sha?: string } };
  const baseSha = refJson.object?.sha;
  if (!baseSha) throw new Error("Missing base commit SHA.");

  const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${baseSha}`, { headers });
  if (!commitRes.ok) throw new Error("Could not read base commit.");
  const commitJson = (await commitRes.json()) as { tree?: { sha?: string } };
  const baseTreeSha = commitJson.tree?.sha;
  if (!baseTreeSha) throw new Error("Missing base tree SHA.");

  const branch = `bootrise/patch-${Date.now()}`;
  const createRef = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha })
  });
  if (!createRef.ok) {
    const text = await createRef.text();
    throw new Error(`Could not create branch (${createRef.status}): ${text.slice(0, 120)}`);
  }

  const onlySet = input.onlyPaths?.length ? new Set(input.onlyPaths) : null;
  const toPush = input.files.filter((f) => !onlySet || onlySet.has(f.path)).slice(0, MAX_FILES_PER_PUSH);
  const pushed: string[] = [];
  const skipped: string[] = [];

  const treeEntries: Array<{ path: string; mode: "100644"; type: "blob"; sha?: string; content?: string }> = [];

  for (const file of toPush) {
    const bytes = Buffer.byteLength(file.content, "utf8");
    if (bytes <= INLINE_BLOB_MAX) {
      treeEntries.push({
        path: file.path,
        mode: "100644",
        type: "blob",
        content: file.content
      });
      pushed.push(file.path);
      continue;
    }

    const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        content: file.content,
        encoding: "utf-8"
      })
    });

    if (!blobRes.ok) {
      skipped.push(file.path);
      continue;
    }

    const blob = (await blobRes.json()) as { sha?: string };
    if (!blob.sha) {
      skipped.push(file.path);
      continue;
    }

    treeEntries.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
    pushed.push(file.path);
  }

  if (treeEntries.length === 0) {
    throw new Error("No files were prepared for push. Check paths and token scopes.");
  }

  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeEntries
    })
  });

  if (!treeRes.ok) {
    const text = await treeRes.text();
    throw new Error(`Git tree create failed (${treeRes.status}): ${text.slice(0, 200)}`);
  }

  const treeJson = (await treeRes.json()) as { sha?: string };
  if (!treeJson.sha) throw new Error("Missing new tree SHA.");

  const newCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: input.commitMessage,
      tree: treeJson.sha,
      parents: [baseSha]
    })
  });

  if (!newCommitRes.ok) {
    throw new Error(`Commit create failed (${newCommitRes.status}).`);
  }

  const newCommit = (await newCommitRes.json()) as { sha?: string };
  if (!newCommit.sha) throw new Error("Missing commit SHA.");

  const updateRef = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ sha: newCommit.sha, force: true })
  });

  if (!updateRef.ok) {
    throw new Error(`Could not update branch ref (${updateRef.status}).`);
  }

  const extra = input.files.filter((f) => !onlySet || onlySet.has(f.path)).length - MAX_FILES_PER_PUSH;
  if (extra > 0) {
    skipped.push(`…and ${extra} more (exceeds BOOTRISE_GITHUB_PUSH_MAX_FILES=${MAX_FILES_PER_PUSH})`);
  }

  return {
    branch,
    pushed,
    skipped,
    compareUrl: `https://github.com/${owner}/${repo}/compare/${defaultBranch}...${branch}`,
    pullRequestHint: `Open a PR: https://github.com/${owner}/${repo}/compare/${defaultBranch}...${branch}?expand=1`
  };
}
