import { extractGithubRepoUrl, parseGithubOwnerRepo } from "@/lib/workspace/github-inspector";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import {
  formatGithubApiError,
  hasGithubToken,
  importGithubFromArchive
} from "@/lib/workspace/github-archive-import";
import { githubApiHeaders } from "@/lib/github/github-api-auth";

const DEFAULT_IMPORT_PATHS = [
  "README.md",
  "package.json",
  "AGENTS.md",
  "app/mobile/package.json",
  "app/backend/main.py",
  "app/frontend/package.json",
  "app/frontend/vite.config.ts"
];

export interface GithubBranch {
  name: string;
  protected: boolean;
}

export async function listGithubBranches(remoteUrl: string): Promise<{ branches: GithubBranch[]; defaultBranch: string }> {
  const parsed = parseGithubOwnerRepo(remoteUrl);
  if (!parsed) throw new Error("Invalid GitHub URL.");

  const headers = await githubApiHeaders();
  try {
    const metaRes = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, { headers });
    if (!metaRes.ok) {
      const text = await metaRes.text().catch(() => "");
      if (metaRes.status === 403 || metaRes.status === 429) {
        return {
          defaultBranch: "main",
          branches: [{ name: "main", protected: false }]
        };
      }
      throw formatGithubApiError(metaRes.status, text);
    }

    const meta = (await metaRes.json()) as { default_branch?: string };
    const branchRes = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/branches?per_page=30`, {
      headers
    });
    if (!branchRes.ok) {
      const defaultBranch = meta.default_branch ?? "main";
      return { defaultBranch, branches: [{ name: defaultBranch, protected: false }] };
    }

    const branches = (await branchRes.json()) as Array<{ name: string; protected?: boolean }>;
    return {
      defaultBranch: meta.default_branch ?? "main",
      branches: branches.map((b) => ({ name: b.name, protected: Boolean(b.protected) }))
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("rate limit")) throw error;
    return { defaultBranch: "main", branches: [{ name: "main", protected: false }] };
  }
}

export type GithubImportMode = "key" | "full";

export async function importGithubFiles(input: {
  remoteUrl: string;
  branch?: string;
  paths?: string[];
  mode?: GithubImportMode;
}): Promise<{
  files: SourceFileInput[];
  branch: string;
  imported: string[];
  skipped: string[];
  mode: GithubImportMode;
  source?: "zipball" | "api";
}> {
  const parsed = parseGithubOwnerRepo(input.remoteUrl);
  if (!parsed) throw new Error("Invalid GitHub URL.");

  let branch = input.branch?.trim();
  if (!branch) {
    try {
      const listed = await listGithubBranches(input.remoteUrl);
      branch = listed.defaultBranch;
    } catch {
      branch = "main";
    }
  }

  const mode = input.mode ?? "key";
  const paths = input.paths?.length ? input.paths : DEFAULT_IMPORT_PATHS;

  let archiveError: unknown;
  try {
    if (mode === "full") {
      const archive = await importGithubFromArchive({
        owner: parsed.owner,
        repo: parsed.repo,
        branch,
        mode: "full"
      });
      return { ...archive, source: "zipball" };
    }

    const archive = await importGithubFromArchive({
      owner: parsed.owner,
      repo: parsed.repo,
      branch,
      mode: "key",
      onlyPaths: paths
    });
    return { ...archive, source: "zipball" };
  } catch (caught) {
    archiveError = caught;
    if (!hasGithubToken()) {
      throw caught instanceof Error
        ? caught
        : new Error("Archive import failed. Configure GitHub App or GITHUB_TOKEN in .env.local for private repos.");
    }
  }

  if (mode === "full" && hasGithubToken()) {
    return { ...(await importGithubRepoFullApi(parsed.owner, parsed.repo, branch, await githubApiHeaders())), source: "api" };
  }

  const headers = await githubApiHeaders();
  const files: SourceFileInput[] = [];
  const imported: string[] = [];
  const skipped: string[] = [];

  for (const path of paths) {
    const content = await fetchFileContent(parsed.owner, parsed.repo, path, branch, headers);
    if (content == null) {
      skipped.push(path);
      continue;
    }
    files.push({ path, content });
    imported.push(path);
  }

  if (files.length === 0) {
    throw archiveError instanceof Error
      ? archiveError
      : new Error("No files could be imported. Configure GitHub App or GITHUB_TOKEN for private repos or pick different paths.");
  }

  return { files, branch, imported, skipped, mode: "key", source: "api" };
}

async function importGithubRepoFullApi(
  owner: string,
  repo: string,
  branch: string,
  headers: Record<string, string>
): Promise<{
  files: SourceFileInput[];
  branch: string;
  imported: string[];
  skipped: string[];
  mode: "full";
}> {
  const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`, {
    headers
  });
  if (!refRes.ok) {
    const text = await refRes.text().catch(() => "");
    throw formatGithubApiError(refRes.status, text);
  }
  const refJson = (await refRes.json()) as { object?: { sha?: string } };
  const commitSha = refJson.object?.sha;
  if (!commitSha) throw new Error("Could not resolve branch commit.");

  const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${commitSha}`, { headers });
  if (!commitRes.ok) {
    const text = await commitRes.text().catch(() => "");
    throw formatGithubApiError(commitRes.status, text);
  }
  const commitJson = (await commitRes.json()) as { tree?: { sha?: string } };
  const treeSha = commitJson.tree?.sha;
  if (!treeSha) throw new Error("Could not resolve git tree for branch.");

  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
    { headers }
  );
  if (!treeRes.ok) {
    const text = await treeRes.text().catch(() => "");
    throw formatGithubApiError(treeRes.status, text);
  }
  const treeJson = (await treeRes.json()) as {
    tree?: Array<{ path?: string; type?: string; size?: number }>;
  };

  const pathList = (treeJson.tree ?? [])
    .filter((entry) => entry.type === "blob" && entry.path && shouldImportPath(entry.path, entry.size))
    .map((entry) => entry.path as string)
    .sort((a, b) => a.localeCompare(b));

  const files: SourceFileInput[] = [];
  const imported: string[] = [];
  const skipped: string[] = [];
  const concurrency = 12;

  for (let i = 0; i < pathList.length; i += concurrency) {
    const batch = pathList.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (path) => {
        const content = await fetchFileContent(owner, repo, path, branch, headers);
        return { path, content };
      })
    );
    for (const { path, content } of batchResults) {
      if (content == null) {
        skipped.push(path);
        continue;
      }
      files.push({ path, content });
      imported.push(path);
    }
  }

  if (files.length === 0) {
    throw new Error("Full import found no readable text files.");
  }

  return { files, branch, imported, skipped, mode: "full" };
}

const FULL_IMPORT_MAX_BYTES = 2_000_000;

const SKIP_PATH_SEGMENTS = [
  "/node_modules/",
  "/.git/",
  "/dist/",
  "/.next/",
  "/__pycache__/",
  "/.expo/",
  "/build/",
  "/coverage/",
  "/.gradle/",
  "/vendor/",
  "/.turbo/",
  "/.cache/"
];

const SKIP_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".mp4",
  ".mov",
  ".zip",
  ".jar",
  ".pdf",
  ".sqlite",
  ".map",
  ".pem"
]);

function shouldImportPath(path: string, size?: number): boolean {
  const normalized = `/${path.replace(/\\/g, "/")}/`;
  if (SKIP_PATH_SEGMENTS.some((segment) => normalized.includes(segment))) return false;
  const ext = path.includes(".") ? path.slice(path.lastIndexOf(".")).toLowerCase() : "";
  if (SKIP_EXTENSIONS.has(ext)) return false;
  if (typeof size === "number" && size > FULL_IMPORT_MAX_BYTES) return false;
  return true;
}

async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  headers: Record<string, string>
): Promise<string | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(url, { headers });
  if (!res.ok) return null;

  const data = (await res.json()) as { content?: string; encoding?: string; type?: string };
  if (data.type !== "file" || !data.content || data.encoding !== "base64") return null;
  return Buffer.from(data.content, "base64").toString("utf8");
}

export function normalizeGithubUrl(messageOrUrl: string): string | null {
  return extractGithubRepoUrl(messageOrUrl);
}
