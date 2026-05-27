import { extractGithubRepoUrl } from "@/lib/workspace/github-url";
import {
  buildRepoPathIndex,
  classifyRepoPath,
  formatRepoPathIndex,
  selectRelevantFiles,
  type LoadedFileSnippet,
  type RepoArea
} from "@/lib/workspace/file-ranking";

const OVERVIEW_DOC_PATTERNS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /(^|\/)README\.md$/i, weight: 100 },
  { pattern: /AGENTS\.md$/i, weight: 95 },
  { pattern: /PRD\.md$/i, weight: 90 },
  { pattern: /application_overview\.md$/i, weight: 88 },
  { pattern: /SNAPROAD_ARCHITECTURE/i, weight: 85 },
  { pattern: /ORION_ARCHITECTURE/i, weight: 70 },
  { pattern: /GETTING_STARTED/i, weight: 65 },
  { pattern: /(^|\/)package\.json$/i, weight: 40 },
  { pattern: /(^|\/)app\.json$/i, weight: 38 },
  { pattern: /app\/backend\/README/i, weight: 35 }
];

export function isRepoOverviewQuestion(message: string): boolean {
  const n = message.toLowerCase().trim();
  if (/\b(fix|implement|add feature|patch|refactor|broken|bug in|change the)\b/.test(n)) return false;
  if (
    /\b(what is this repo|what's this repo|what is this (codebase|project)|what is .+ about|tell me about (this |the )?(repo|codebase|project)|describe (this |the )?(repo|codebase)|repo about|about this (repo|codebase|project)|overview of (the |this )?repo)\b/.test(
      n
    )
  ) {
    return true;
  }
  const url = extractGithubRepoUrl(message);
  if (!url) return false;
  return (
    /\b(what|about|describe|explain|overview|purpose|do(es)? this)\b/.test(n) &&
    !/\b(review|audit|issue|risk|fix|hud|marker|reanimated)\b/.test(n)
  );
}

export function selectOverviewFiles(files: LoadedFileSnippet[], maxFiles = 24): LoadedFileSnippet[] {
  const byPath = new Map(files.map((f) => [f.path, f]));
  const scored = files
    .map((file) => {
      let score = 0;
      for (const { pattern, weight } of OVERVIEW_DOC_PATTERNS) {
        if (pattern.test(file.path)) score = Math.max(score, weight);
      }
      if (classifyRepoPath(file.path) === "docs") score += 20;
      return { file, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.file.path.localeCompare(b.file.path));

  const picked: LoadedFileSnippet[] = [];
  const seen = new Set<string>();
  for (const row of scored) {
    if (picked.length >= maxFiles) break;
    if (seen.has(row.file.path)) continue;
    picked.push(row.file);
    seen.add(row.file.path);
  }

  if (picked.length >= 6) return picked;

  const ranked = selectRelevantFiles("what is this repo product architecture readme", files, maxFiles);
  for (const file of ranked) {
    if (picked.length >= maxFiles) break;
    if (seen.has(file.path)) continue;
    picked.push(file);
    seen.add(file.path);
  }

  return picked.length > 0 ? picked : files.filter((f) => /readme|agents|prd/i.test(f.path)).slice(0, 12);
}

function excerpt(file: LoadedFileSnippet, max = 1200): string {
  const text = file.content.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function firstParagraph(text: string, max = 400): string {
  const block = text
    .replace(/^#.+$/gm, "")
    .split(/\n\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .find((p) => p.length > 40);
  return block?.slice(0, max) ?? "";
}

function inferProductName(files: LoadedFileSnippet[], githubUrl?: string | null): string {
  const readme = files.find((f) => /(^|\/)README\.md$/i.test(f.path));
  const title = readme?.content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (title) return title;
  const appJson = files.find((f) => /(^|\/)app\.json$/i.test(f.path));
  const name = appJson?.content.match(/"name"\s*:\s*"([^"]+)"/)?.[1];
  if (name) return name;
  if (githubUrl) {
    const m = githubUrl.match(/github\.com\/[^/]+\/([^/]+)/i);
    if (m?.[1]) return m[1].replace(/-/g, " ");
  }
  return "this codebase";
}

function summarizeStack(files: LoadedFileSnippet[]): string[] {
  const hints: string[] = [];
  const paths = files.map((f) => f.path.toLowerCase()).join("\n");
  if (paths.includes("app/mobile")) hints.push("Expo / React Native mobile app (Mapbox navigation, Orion voice, rewards)");
  if (paths.includes("app/frontend")) hints.push("Vite + React web (driver portal, partner/admin dashboards)");
  if (paths.includes("app/backend")) hints.push("Python FastAPI backend (routes, services, Supabase/SQL migrations)");
  if (paths.includes(".github/workflows")) hints.push("CI via GitHub Actions (validate, EAS, security gates)");
  if (paths.includes("expo") || paths.includes("eas.json")) hints.push("EAS builds for iOS/Android dev clients");
  return hints;
}

function keyFlowsFromDocs(docText: string): string[] {
  const flows: string[] = [];
  const lower = docText.toLowerCase();
  if (/navigation|mapbox|turn|route/.test(lower)) flows.push("Map-first driving: search, routing, turn-by-turn HUD, reroute, traffic/incidents");
  if (/offer|reward|redemption|gem/.test(lower)) flows.push("Offers & rewards: discovery, redemption, gems, partner offers");
  if (/orion|voice|coach/.test(lower)) flows.push("Orion: in-drive voice companion and coaching");
  if (/partner|admin|business/.test(lower)) flows.push("Partner & admin surfaces (web) for offers, analytics, moderation");
  if (/family|friend|social|convoy/.test(lower)) flows.push("Social: friends, family mode, live location sharing");
  if (flows.length === 0) flows.push("Core mobile driving experience plus API-backed web/admin tooling");
  return flows.slice(0, 5);
}

export function buildRepoOverviewReply(input: {
  message: string;
  files: LoadedFileSnippet[];
  productName?: string;
}): {
  reply: string;
  overviewFiles: LoadedFileSnippet[];
  coverageSummary: string;
} {
  const overviewFiles = selectOverviewFiles(input.files, 20);
  const deepPaths = new Set(overviewFiles.map((f) => f.path));
  const index = buildRepoPathIndex(input.files, deepPaths);
  const githubUrl = extractGithubRepoUrl(input.message);
  const productName = input.productName?.trim() || inferProductName(input.files, githubUrl);

  const docBodies = overviewFiles
    .filter((f) => classifyRepoPath(f.path) === "docs" || /readme|agents|prd|architecture|overview/i.test(f.path))
    .slice(0, 6);
  const mergedDocText = docBodies.map((f) => excerpt(f, 800)).join("\n");
  const readme = overviewFiles.find((f) => /README\.md$/i.test(f.path));
  const agents = overviewFiles.find((f) => /AGENTS\.md$/i.test(f.path));
  const elevator = readme ? firstParagraph(readme.content) : firstParagraph(mergedDocText);

  const stack = summarizeStack(input.files);
  const flows = keyFlowsFromDocs(`${mergedDocText}\n${agents?.content ?? ""}`);
  const areas = (["mobile", "frontend", "backend", "docs", "tests", "config"] as RepoArea[])
    .map((area) => ({ area, count: index.byArea[area]?.count ?? 0 }))
    .filter((row) => row.count > 0);

  const lines = [
    `WHAT THIS IS:`,
    `${productName} is a monorepo BootRise indexed (${input.files.length} files). ${elevator || "It combines a driver-facing mobile app, API backend, and web portals for partners and operations."}`,
    githubUrl ? `Source: ${githubUrl}` : null,
    "",
    `HOW IT IS ORGANIZED:`,
    formatRepoPathIndex(index),
    areas.length
      ? `By area: ${areas.map((a) => `${a.area} ${a.count}`).join(" · ")}.`
      : null,
    "",
    `TECH STACK (from tree + docs):`,
    ...stack.map((s, i) => `${i + 1}. ${s}`),
    "",
    `PRIMARY USER FLOWS (inferred):`,
    ...flows.map((f, i) => `${i + 1}. ${f}`),
    "",
    `DOCS BOOTRISE READ FOR THIS ANSWER:`,
    overviewFiles
      .slice(0, 10)
      .map((f) => `• ${f.path}`)
      .join("\n"),
    agents
      ? `\nEngineering guardrails live in AGENTS.md (Mapbox MarkerView, Reanimated v4, safe area, backend port 8001). Ask a targeted question before Fix changes those areas.`
      : null,
    "",
    `SUGGESTED NEXT STEPS:`,
    `1. Open Project Brain and confirm modules match how you describe the product.`,
    `2. Ask a narrow question (e.g. "How does navigation ETA work on mobile?") — BootRise will deep-read that slice only.`,
    `3. When ready to change code, describe one scoped fix and run Fix — scope lock applies only to work intent, not this overview.`,
    readme || agents
      ? null
      : `\nTip: Add or refresh README.md / AGENTS.md in the repo for richer automatic overviews.`
  ];

  return {
    reply: lines.filter((line) => line !== null).join("\n"),
    overviewFiles,
    coverageSummary: `Repo overview: ${overviewFiles.length} doc and config files from ${input.files.length} imported`
  };
}
