import { githubApiHeaders } from "@/lib/github/github-api-auth";
import {
  extractGithubRepoUrl,
  parseGithubOwnerRepo,
  shouldInspectGithubRepo as shouldInspectGithubRepoUrl
} from "@/lib/workspace/github-url";

export { extractGithubRepoUrl, parseGithubOwnerRepo, shouldInspectGithubRepo } from "@/lib/workspace/github-url";

export interface GithubRepoInsight {
  url: string;
  owner: string;
  repo: string;
  description: string | null;
  readmeExcerpt: string | null;
  defaultBranch: string;
  isPrivate: boolean | null;
  stars: number;
  openIssues: number;
  topLevelEntries: string[];
  keyPaths: string[];
  stackHints: string[];
  bootriseNotes: string[];
  fetchError?: string;
}

export function isGithubReviewIntent(message: string): boolean {
  return shouldInspectGithubRepoUrl(message);
}

export async function inspectGithubRepo(url: string): Promise<GithubRepoInsight> {
  const parsed = parseGithubOwnerRepo(url);
  if (!parsed) {
    return {
      url,
      owner: "",
      repo: "",
      description: null,
      defaultBranch: "main",
      isPrivate: null,
      stars: 0,
      openIssues: 0,
      topLevelEntries: [],
      keyPaths: [],
      stackHints: [],
      readmeExcerpt: null,
      bootriseNotes: ["Could not parse GitHub URL."],
      fetchError: "Invalid GitHub repository URL."
    };
  }

  const { owner, repo } = parsed;
  const headers = await githubApiHeaders();

  try {
    const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      next: { revalidate: 300 }
    });

    if (!metaRes.ok) {
      const reason =
        metaRes.status === 404
          ? "Repository not found or private without a token."
          : `GitHub API returned ${metaRes.status}.`;
      return emptyInsight(url, owner, repo, reason);
    }

    const meta = (await metaRes.json()) as {
      description: string | null;
      default_branch: string;
      private: boolean;
      stargazers_count: number;
      open_issues_count: number;
    };

    const branch = meta.default_branch ?? "main";
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers, next: { revalidate: 300 } }
    );

    let paths: string[] = [];
    if (treeRes.ok) {
      const tree = (await treeRes.json()) as { tree?: Array<{ path: string; type: string }> };
      paths = (tree.tree ?? [])
        .filter((entry) => entry.type === "blob")
        .map((entry) => entry.path)
        .slice(0, 200);
    }

    const topLevelEntries = Array.from(
      new Set(paths.map((path) => path.split("/")[0]).filter(Boolean))
    ).slice(0, 20);

    const readmeExcerpt = await fetchReadmeExcerpt(owner, repo, headers);
    const keyPaths = pickKeyPaths(paths);
    const stackHints = inferStackHints(paths, topLevelEntries);
    const bootriseNotes = buildBootriseNotes(paths, stackHints, meta.private, keyPaths);

    return {
      url,
      owner,
      repo,
      description: meta.description,
      readmeExcerpt,
      defaultBranch: branch,
      isPrivate: meta.private,
      stars: meta.stargazers_count,
      openIssues: meta.open_issues_count,
      topLevelEntries,
      keyPaths,
      stackHints,
      bootriseNotes
    };
  } catch (error) {
    return emptyInsight(url, owner, repo, error instanceof Error ? error.message : "GitHub fetch failed.");
  }
}

function emptyInsight(url: string, owner: string, repo: string, fetchError: string): GithubRepoInsight {
  return {
    url,
    owner,
    repo,
    description: null,
    defaultBranch: "main",
    isPrivate: null,
    stars: 0,
    openIssues: 0,
    topLevelEntries: [],
    keyPaths: [],
    stackHints: [],
    readmeExcerpt: null,
    bootriseNotes: [
      fetchError,
      "Paste key files into Code intake, or connect a GitHub token later for private repos."
    ],
    fetchError
  };
}

async function fetchReadmeExcerpt(
  owner: string,
  repo: string,
  headers: Record<string, string>
): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers, next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: string; encoding?: string };
    if (!data.content || data.encoding !== "base64") return null;
    const decoded = Buffer.from(data.content, "base64").toString("utf8");
    return decoded.replace(/\s+/g, " ").trim().slice(0, 600);
  } catch {
    return null;
  }
}

function pickKeyPaths(paths: string[]): string[] {
  const priority = [
    "README.md",
    "package.json",
    "app/mobile/package.json",
    "app/backend",
    "app/frontend",
    "AGENTS.md",
    "docker-compose",
    "vercel.json"
  ];
  const picked: string[] = [];
  for (const hint of priority) {
    const match = paths.find((p) => p === hint || p.includes(hint));
    if (match && !picked.includes(match)) picked.push(match);
  }
  return picked.slice(0, 8);
}

function inferStackHints(paths: string[], topLevel: string[]): string[] {
  const hints = new Set<string>();
  if (topLevel.includes("app") && paths.some((p) => p.startsWith("app/mobile"))) {
    hints.add("Monorepo: mobile (Expo/RN) + backend + web");
  }
  if (paths.some((p) => p.includes("MapScreen") || p.includes("mapbox") || p.includes("snaproad"))) {
    hints.add("Navigation / maps product (SnapRoad-style)");
  }
  if (paths.some((p) => p.endsWith(".tsx") || p.includes("next.config"))) hints.add("Next.js / React");
  if (paths.some((p) => p.includes("fastapi") || p.endsWith("routes/"))) hints.add("Python FastAPI backend");
  if (paths.some((p) => p.includes("expo") || p.includes("react-native"))) hints.add("Expo / React Native");
  if (topLevel.includes("supabase") || paths.some((p) => p.includes("migrations"))) hints.add("Supabase / SQL");
  if (paths.some((p) => p === "package.json")) hints.add("Node.js workspace");
  return Array.from(hints);
}

function buildBootriseNotes(paths: string[], stackHints: string[], isPrivate: boolean, keyPaths: string[]): string[] {
  const notes = [
    "BootRise persists imports to `.bootrise/repos/{repositoryId}` — re-import only writes changed files.",
    isPrivate
      ? "Private repo: configure GitHub App or GITHUB_TOKEN on the server; canonical store survives browser refresh."
      : "Public metadata loaded. Full imports sync to server-side repo store for incremental updates."
  ];
  if (paths.length > 100) notes.push(`Large codebase (${paths.length}+ tracked paths) — start with one module at a time.`);
  if (stackHints.length > 0) notes.push(`Detected stack: ${stackHints.join(", ")}.`);
  if (keyPaths.length > 0) notes.push(`Start with: ${keyPaths.join(", ")}.`);
  return notes;
}

export function formatGithubReviewReply(insight: GithubRepoInsight): string {
  if (insight.fetchError) {
    return [
      `**GitHub** — ${insight.owner}/${insight.repo}`,
      insight.fetchError,
      "",
      "Next: complete GitHub App setup (docs/GITHUB_APP.md) or GITHUB_TOKEN in .env.local for private repos."
    ].join("\n");
  }

  const lines = [
    `**${insight.owner}/${insight.repo}**`,
    insight.description ? insight.description : null,
    insight.readmeExcerpt ? `From README: ${insight.readmeExcerpt}` : null,
    `Branch: \`${insight.defaultBranch}\`${insight.isPrivate ? " · private" : " · public"} · ★ ${insight.stars}`,
    insight.stackHints.length ? `Stack: ${insight.stackHints.join(" · ")}` : null,
    insight.topLevelEntries.length ? `Root: ${insight.topLevelEntries.slice(0, 12).join(", ")}` : null,
    insight.keyPaths.length ? `Key paths: ${insight.keyPaths.join(", ")}` : null,
    "",
    "**BootRise next steps**",
    ...insight.bootriseNotes.map((n) => `• ${n}`)
  ];

  return lines.filter(Boolean).join("\n");
}
