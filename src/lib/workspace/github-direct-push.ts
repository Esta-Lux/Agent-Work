import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { parseGithubOwnerRepo } from "@/lib/workspace/github-inspector";
import { resolveGithubApiToken } from "@/lib/github/github-api-auth";

export interface DirectPushResult {
  branch: string;
  commitSha: string;
  pushed: string[];
  unpushed: string[];
}

const MAX_FILES_PER_PUSH = Number(process.env.BOOTRISE_GITHUB_PUSH_MAX_FILES ?? "500");
const INLINE_BLOB_MAX = 900_000;

async function requireGithubHeaders(): Promise<Record<string, string>> {
  const token = await resolveGithubApiToken();
  if (!token) {
    throw new Error(
      "GitHub credentials required for direct push. Set GITHUB_APP_CLIENT_ID (or GITHUB_APP_ID) + GITHUB_APP_PRIVATE_KEY, or GITHUB_TOKEN."
    );
  }
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "BootRise-Admin-Agent"
  };
}

export async function pushFilesDirectlyToBranch(opts: {
  remoteUrl: string;
  branch: string;
  files: SourceFileInput[];
  onlyPaths?: string[];
  commitMessage: string;
  confirmDirectPushToMain: boolean;
}): Promise<DirectPushResult> {
  const branch = opts.branch.trim();
  if (!branch) throw new Error("Direct push requires a branch name.");

  const isMain = branch === "main" || branch === "master";
  if (isMain && !opts.confirmDirectPushToMain) {
    throw new Error(
      `Direct push to ${branch} requires confirmDirectPushToMain=true. Refusing for safety.`
    );
  }

  const parsed = parseGithubOwnerRepo(opts.remoteUrl);
  if (!parsed) throw new Error("Invalid GitHub URL.");

  const headers = await requireGithubHeaders();
  const owner = parsed.owner;
  const repo = parsed.repo;

  const refRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
    { headers }
  );
  if (!refRes.ok) {
    throw new Error(`Could not read branch ${branch} (${refRes.status}).`);
  }
  const refJson = (await refRes.json()) as { object?: { sha?: string } };
  const parentSha = refJson.object?.sha;
  if (!parentSha) throw new Error("Missing parent commit SHA on target branch.");

  const parentCommitRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/commits/${parentSha}`,
    { headers }
  );
  if (!parentCommitRes.ok) throw new Error("Could not read parent commit.");
  const parentCommitJson = (await parentCommitRes.json()) as { tree?: { sha?: string } };
  const baseTreeSha = parentCommitJson.tree?.sha;
  if (!baseTreeSha) throw new Error("Missing base tree SHA.");

  const onlySet = opts.onlyPaths?.length ? new Set(opts.onlyPaths) : null;
  const toPush = opts.files
    .filter((f) => !onlySet || onlySet.has(f.path))
    .slice(0, MAX_FILES_PER_PUSH);

  const pushed: string[] = [];
  const unpushed: string[] = [];
  const treeEntries: Array<{ path: string; mode: "100644"; type: "blob"; sha?: string; content?: string }> = [];

  for (const file of toPush) {
    const bytes = Buffer.byteLength(file.content, "utf8");
    if (bytes <= INLINE_BLOB_MAX) {
      treeEntries.push({ path: file.path, mode: "100644", type: "blob", content: file.content });
      pushed.push(file.path);
      continue;
    }
    const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ content: file.content, encoding: "utf-8" })
    });
    if (!blobRes.ok) {
      unpushed.push(file.path);
      continue;
    }
    const blob = (await blobRes.json()) as { sha?: string };
    if (!blob.sha) {
      unpushed.push(file.path);
      continue;
    }
    treeEntries.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
    pushed.push(file.path);
  }

  if (treeEntries.length === 0) {
    throw new Error("No files were prepared for direct push. Check paths and token scopes.");
  }

  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries })
  });
  if (!treeRes.ok) {
    const text = await treeRes.text();
    throw new Error(`Git tree create failed (${treeRes.status}): ${text.slice(0, 200)}`);
  }
  const treeJson = (await treeRes.json()) as { sha?: string };
  if (!treeJson.sha) throw new Error("Missing new tree SHA.");

  const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ message: opts.commitMessage, tree: treeJson.sha, parents: [parentSha] })
  });
  if (!commitRes.ok) {
    const text = await commitRes.text();
    throw new Error(`Commit create failed (${commitRes.status}): ${text.slice(0, 200)}`);
  }
  const commitJson = (await commitRes.json()) as { sha?: string };
  if (!commitJson.sha) throw new Error("Missing new commit SHA.");

  const updateRef = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,
    {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ sha: commitJson.sha, force: false })
    }
  );
  if (!updateRef.ok) {
    const text = await updateRef.text();
    throw new Error(`Could not advance branch ref (${updateRef.status}): ${text.slice(0, 200)}`);
  }

  const overflow = opts.files.filter((f) => !onlySet || onlySet.has(f.path)).length - MAX_FILES_PER_PUSH;
  if (overflow > 0) {
    unpushed.push(`…and ${overflow} more (exceeds BOOTRISE_GITHUB_PUSH_MAX_FILES=${MAX_FILES_PER_PUSH})`);
  }

  return { branch, commitSha: commitJson.sha, pushed, unpushed };
}
