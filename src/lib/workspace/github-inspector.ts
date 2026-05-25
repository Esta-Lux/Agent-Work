export interface GithubRepoInsight {
  url: string;
  owner: string;
  repo: string;
  description: string | null;
  defaultBranch: string;
  isPrivate: boolean | null;
  stars: number;
  openIssues: number;
  topLevelEntries: string[];
  stackHints: string[];
  bootriseNotes: string[];
  fetchError?: string;
}

export function extractGithubRepoUrl(message: string): string | null {
  const match = message.match(/https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/i);
  return match ? match[0].replace(/\.git$/, "").replace(/\/$/, "") : null;
}

export function isGithubReviewIntent(message: string): boolean {
  const normalized = message.toLowerCase();
  const hasUrl = Boolean(extractGithubRepoUrl(message));
  if (!hasUrl) return false;
  if (normalized.includes("export") || normalized.includes("download bundle") || normalized.includes("push steps")) {
    return false;
  }
  return (
    normalized.includes("review") ||
    normalized.includes("look at") ||
    normalized.includes("analyze") ||
    normalized.includes("inspect") ||
    normalized.includes("check") ||
    normalized.includes("what do you think")
  );
}

export function parseGithubOwnerRepo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
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
      stackHints: [],
      bootriseNotes: ["Could not parse GitHub URL."],
      fetchError: "Invalid GitHub repository URL."
    };
  }

  const { owner, repo } = parsed;
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "BootRise-Workspace"
  };

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

    const stackHints = inferStackHints(paths, topLevelEntries);
    const bootriseNotes = buildBootriseNotes(paths, stackHints, meta.private);

    return {
      url,
      owner,
      repo,
      description: meta.description,
      defaultBranch: branch,
      isPrivate: meta.private,
      stars: meta.stargazers_count,
      openIssues: meta.open_issues_count,
      topLevelEntries,
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
    stackHints: [],
    bootriseNotes: [
      fetchError,
      "Paste key files into Code intake, or connect a GitHub token later for private repos."
    ],
    fetchError
  };
}

function inferStackHints(paths: string[], topLevel: string[]): string[] {
  const hints = new Set<string>();
  if (topLevel.includes("app") && paths.some((p) => p.includes("mobile"))) hints.add("Monorepo with mobile + backend");
  if (paths.some((p) => p.endsWith(".tsx") || p.includes("next.config"))) hints.add("Next.js / React");
  if (paths.some((p) => p.includes("fastapi") || p.endsWith(".py"))) hints.add("Python backend");
  if (paths.some((p) => p.includes("expo") || p.includes("react-native"))) hints.add("Expo / React Native");
  if (topLevel.includes("supabase") || paths.some((p) => p.includes("migrations"))) hints.add("Supabase / SQL migrations");
  if (topLevel.includes("package.json") || paths.some((p) => p === "package.json")) hints.add("Node.js workspace");
  return Array.from(hints);
}

function buildBootriseNotes(paths: string[], stackHints: string[], isPrivate: boolean): string[] {
  const notes = [
    "BootRise can plan fixes on pasted files today; full GitHub clone sync is a later step.",
    isPrivate
      ? "This repo is private — paste critical paths (auth, API routes, schema) for accurate blast-radius analysis."
      : "Public metadata loaded. Paste files you want changed for a fix-and-report run."
  ];
  if (paths.length > 100) notes.push(`Large codebase (${paths.length}+ tracked paths) — start with one module at a time.`);
  if (stackHints.length > 0) notes.push(`Detected stack: ${stackHints.join(", ")}.`);
  return notes;
}
