import { strFromU8, unzipSync } from "fflate";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { hasGithubTokenSync, resolveGithubApiToken } from "@/lib/github/github-api-auth";

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

export function hasGithubToken(): boolean {
  return hasGithubTokenSync();
}

export function formatGithubApiError(status: number, body?: string): Error {
  if (status === 403 || status === 429) {
    const rateLimited = /rate limit|remaining: 0/i.test(body ?? "");
    if (rateLimited || status === 429) {
      return new Error(
        hasGithubToken()
          ? "GitHub API rate limit exceeded. Wait a few minutes or use a token with higher limits."
          : "GitHub API rate limit exceeded. Configure GITHUB_APP_* (installation token) or GITHUB_TOKEN in .env.local."
      );
    }
    return new Error(
      hasGithubToken()
        ? `GitHub denied access (${status}). Check token scopes for this repo.`
        : `GitHub denied access (${status}). Configure GitHub App or GITHUB_TOKEN for private repos.`
    );
  }
  return new Error(`GitHub request failed (${status})${body ? `: ${body.slice(0, 120)}` : ""}.`);
}

function shouldImportPath(path: string, byteLength?: number): boolean {
  const normalized = `/${path.replace(/\\/g, "/")}/`;
  if (SKIP_PATH_SEGMENTS.some((segment) => normalized.includes(segment))) return false;
  const ext = path.includes(".") ? path.slice(path.lastIndexOf(".")).toLowerCase() : "";
  if (SKIP_EXTENSIONS.has(ext)) return false;
  if (typeof byteLength === "number" && byteLength > FULL_IMPORT_MAX_BYTES) return false;
  return true;
}

function stripZipRootPrefix(entryPath: string): string | null {
  const parts = entryPath.replace(/\\/g, "/").split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return parts.slice(1).join("/");
}

async function downloadRepoZip(owner: string, repo: string, branch: string): Promise<Uint8Array> {
  const token = await resolveGithubApiToken();
  const ua = { "User-Agent": "BootRise-Workspace" };

  const codeloadUrl = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${encodeURIComponent(branch)}`;
  let res = await fetch(codeloadUrl, { headers: ua, redirect: "follow" });

  if (!res.ok && token) {
    const apiZip = `https://api.github.com/repos/${owner}/${repo}/zipball/${encodeURIComponent(branch)}`;
    res = await fetch(apiZip, {
      headers: { ...ua, Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      redirect: "follow"
    });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw formatGithubApiError(res.status, text);
  }

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength < 100) {
    throw new Error("Downloaded archive was empty. Check branch name and repo URL.");
  }
  return new Uint8Array(buffer);
}

export async function importGithubFromArchive(input: {
  owner: string;
  repo: string;
  branch: string;
  mode: "key" | "full";
  onlyPaths?: string[];
}): Promise<{
  files: SourceFileInput[];
  branch: string;
  imported: string[];
  skipped: string[];
  mode: "key" | "full";
  source: "zipball";
}> {
  const zipBytes = await downloadRepoZip(input.owner, input.repo, input.branch);
  let entries: Record<string, Uint8Array>;

  try {
    entries = unzipSync(zipBytes);
  } catch {
    throw new Error("Could not unzip repository archive. Try again or configure GitHub credentials.");
  }

  const files: SourceFileInput[] = [];
  const imported: string[] = [];
  const skipped: string[] = [];
  const onlySet = input.onlyPaths?.length ? new Set(input.onlyPaths) : null;

  for (const [entryPath, bytes] of Object.entries(entries)) {
    if (entryPath.endsWith("/")) continue;
    const path = stripZipRootPrefix(entryPath);
    if (!path) continue;

    if (!shouldImportPath(path, bytes.byteLength)) {
      skipped.push(path);
      continue;
    }

    if (onlySet && !onlySet.has(path)) continue;

    try {
      const content = strFromU8(bytes);
      if (!content.trim()) continue;
      files.push({ path, content });
      imported.push(path);
    } catch {
      skipped.push(path);
    }
  }

  if (files.length === 0) {
    throw new Error(
      onlySet
        ? "Key files not found in archive. Check branch or use full import."
        : "No text files found in archive after filtering."
    );
  }

  imported.sort((a, b) => a.localeCompare(b));
  return {
    files,
    branch: input.branch,
    imported,
    skipped,
    mode: input.mode,
    source: "zipball"
  };
}
