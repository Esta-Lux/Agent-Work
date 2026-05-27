/** Client-safe GitHub URL helpers (no node:crypto / fs). */

export function extractGithubRepoUrl(message: string): string | null {
  const match = message.match(/https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/i);
  return match ? match[0].replace(/\.git$/, "").replace(/\/$/, "") : null;
}

export function parseGithubOwnerRepo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

export function shouldInspectGithubRepo(message: string): boolean {
  const normalized = message.toLowerCase();
  if (!extractGithubRepoUrl(message)) return false;
  if (normalized.includes("download bundle")) return false;
  if (normalized.includes("push steps") && normalized.includes("github")) return false;
  return true;
}
