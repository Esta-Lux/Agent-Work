export interface LoadedFileSnippet {
  path: string;
  content: string;
}

export type RepoArea = "mobile" | "frontend" | "backend" | "docs" | "tests" | "config" | "other";

const REVIEW_KEYWORDS: Array<{ terms: string[]; pathHints: string[]; boost?: number }> = [
  {
    terms: ["turn card", "turn-card", "maneuver", "instruction card", "then in"],
    pathHints: [
      "turncard",
      "turninstruction",
      "turn-card",
      "navhud",
      "mapscreen",
      "navdisplay",
      "sdkguidance",
      "banner",
      "navigation/"
    ],
    boost: 12
  },
  {
    terms: ["hud", "heads-up", "navigation ui", "navigating", "while driving", "eta strip", "driving"],
    pathHints: [
      "mapscreen",
      "navhud",
      "turninstruction",
      "turncard",
      "navigationdebug",
      "etastrip",
      "speedindicator",
      "lane",
      "maneuver",
      "navbanner",
      "navigationstatus",
      "fab",
      "recenter",
      "navpuck"
    ],
    boost: 14
  },
  {
    terms: ["snaproad", "what is", "about this app", "product"],
    pathHints: ["readme", "agents.md", "package.json", "app.json", "architecture"]
  },
  {
    terms: ["map", "mapbox", "route", "reroute", "gps", "puck"],
    pathHints: ["mapscreen", "mapbox", "navigation", "directions", "route", "navsdk", "navpuck"]
  },
  {
    terms: ["backend", "api", "fastapi", "route", "auth", "middleware"],
    pathHints: ["app/backend/routes", "app/backend/services", "app/backend/main.py", "middleware"]
  },
  {
    terms: ["mobile", "expo", "react native", "react-native"],
    pathHints: ["app/mobile/src", "app/mobile/app"]
  },
  {
    terms: ["frontend", "web", "vite", "driver app"],
    pathHints: ["app/frontend/src", "driverapp"]
  }
];

const SOURCE_PRIORITY_HINTS: Array<{ pattern: string; score: number; areas?: RepoArea[] }> = [
  { pattern: "app/mobile/src/screens/mapscreen", score: 20, areas: ["mobile"] },
  { pattern: "app/mobile/src/navigation/", score: 16, areas: ["mobile"] },
  { pattern: "app/mobile/src/components/map/", score: 14, areas: ["mobile"] },
  { pattern: "app/mobile/src/components/navigation/", score: 16, areas: ["mobile"] },
  { pattern: "app/mobile/src/hooks/usenavigation", score: 12, areas: ["mobile"] },
  { pattern: "app/mobile/src/hooks/usedrivenavigation", score: 12, areas: ["mobile"] },
  { pattern: "app/backend/routes/navigation", score: 12, areas: ["backend"] },
  { pattern: "app/backend/routes/directions", score: 10, areas: ["backend"] },
  { pattern: "app/backend/routes/mapbox", score: 10, areas: ["backend"] },
  { pattern: "app/backend/services/", score: 8, areas: ["backend"] },
  { pattern: "app/backend/routes/", score: 8, areas: ["backend"] },
  { pattern: "app/backend/main.py", score: 8, areas: ["backend"] },
  { pattern: "app/frontend/src/pages/driverapp", score: 10, areas: ["frontend"] },
  { pattern: "app/frontend/src/components/", score: 6, areas: ["frontend"] },
  { pattern: "agents.md", score: 6, areas: ["docs"] },
  { pattern: "readme.md", score: 4, areas: ["docs"] }
];

function wantsTestContext(message: string): boolean {
  const n = message.toLowerCase();
  if (/\b(not test|without test|exclude test|besides test|other than test)\b/.test(n)) return false;
  if (
    /\b(cover|including)\b/.test(n) &&
    /\btests\b/.test(n) &&
    /\b(mobile|frontend|backend|docs|hud|navigat)\b/.test(n)
  ) {
    return false;
  }
  return /\b(test coverage|pytest|test suite|test gaps|review tests|audit tests|our tests|the tests|e2e spec|unit tests only)\b/.test(
    n
  );
}

function excludesTests(message: string): boolean {
  const n = message.toLowerCase();
  return (
    /\b(besides test|without test|not test|exclude test|other than test|non-test|actual (code|files|source))\b/.test(n) ||
    (/\b(review|issue|risk|gap|wrong|broken|hud|navigat|map screen)\b/.test(n) && !wantsTestContext(n))
  );
}

function isBroadCodebaseReview(message: string): boolean {
  const n = message.toLowerCase();
  return (
    /\b(review|audit|list all|issues?|risks?|gaps?|overall|whole codebase|entire (repo|codebase))\b/.test(n) &&
    !/\b(test file|pytest only)\b/.test(n)
  );
}

function isHudOrNavigationReview(message: string): boolean {
  const n = message.toLowerCase();
  return /\b(hud|heads-up|navigat|turn card|map screen|while driving|driving mode|eta strip|maneuver)\b/.test(n);
}

export function classifyRepoPath(path: string): RepoArea {
  const p = path.toLowerCase().replace(/\\/g, "/");
  if (isTestPath(p)) return "tests";
  if (p.includes("agents.md") || p.endsWith("/readme.md") || p.includes("/docs/")) return "docs";
  if (p.includes("package.json") || p.includes(".env.example") || p.includes("eslint") || p.includes("workflow")) {
    return "config";
  }
  if (p.startsWith("app/mobile/")) return "mobile";
  if (p.startsWith("app/frontend/")) return "frontend";
  if (p.startsWith("app/backend/")) return "backend";
  return "other";
}

export function isTestPath(path: string): boolean {
  const p = path.toLowerCase().replace(/\\/g, "/");
  if (p.includes("/tests/") || p.includes("/test/")) return true;
  if (p.includes("/__tests__/") || p.includes("/e2e/")) return true;
  if (/\/test_[^/]+\.(py|ts|tsx|js|jsx)$/.test(p)) return true;
  if (/\.(spec|test)\.(ts|tsx|js|jsx)$/.test(p)) return true;
  if (p.includes("test-results") || p.includes("pytest/") || p.includes("coverage.xml")) return true;
  return false;
}

function scoreFile(
  path: string,
  message: string,
  options: { wantsTests: boolean; excludeTests: boolean; broadReview: boolean; hudNav: boolean }
): number {
  const pathLower = path.toLowerCase();
  const area = classifyRepoPath(path);
  let score = 0;

  if (options.excludeTests && area === "tests") {
    return -1000;
  }

  if (area === "tests") {
    score += options.wantsTests ? 10 : -8;
  }

  for (const hint of SOURCE_PRIORITY_HINTS) {
    if (pathLower.includes(hint.pattern)) {
      score += hint.score;
      if (options.hudNav && hint.areas?.includes("mobile")) score += 6;
    }
  }

  for (const group of REVIEW_KEYWORDS) {
    if (group.terms.some((t) => message.includes(t))) {
      const boost = group.boost ?? 6;
      for (const hint of group.pathHints) {
        if (pathLower.includes(hint)) score += boost;
      }
    }
  }

  for (const token of message.split(/\W+/).filter((t) => t.length > 3)) {
    if (pathLower.includes(token)) score += 3;
  }

  if (options.broadReview) {
    if (area === "mobile" && pathLower.includes("/src/")) score += 10;
    if (area === "frontend" && pathLower.includes("/src/")) score += 8;
    if (area === "backend" && (pathLower.includes("/routes/") || pathLower.includes("/services/"))) score += 10;
    if (area === "docs") score += 4;
    if (area === "config") score += 1;
  }

  if (options.hudNav) {
    if (area === "mobile" && /mapscreen|navigation|turn|navhud|lane|maneuver|speedindicator|navpuck/.test(pathLower)) {
      score += 18;
    }
    if (area === "backend" && /navigation|directions|mapbox/.test(pathLower)) score += 6;
    if (area === "tests") score -= 20;
  }

  if (pathLower.endsWith("agents.md")) score += 8;
  if (pathLower.endsWith("readme.md") && !pathLower.includes("node_modules")) score += 3;

  return score;
}

type ScoredFile = { file: LoadedFileSnippet; score: number; area: RepoArea };

function rankFiles(message: string, files: LoadedFileSnippet[]): ScoredFile[] {
  const n = message.toLowerCase();
  const options = {
    wantsTests: wantsTestContext(n),
    excludeTests: excludesTests(n),
    broadReview: isBroadCodebaseReview(n),
    hudNav: isHudOrNavigationReview(n)
  };

  return files
    .map((file) => ({
      file,
      score: scoreFile(file.path, n, options),
      area: classifyRepoPath(file.path)
    }))
    .filter((row) => row.score > -500)
    .sort((a, b) => b.score - a.score || a.file.path.localeCompare(b.file.path));
}

function pickWithQuotas(ranked: ScoredFile[], maxFiles: number, quotas: Partial<Record<RepoArea, number>>): LoadedFileSnippet[] {
  const picked: LoadedFileSnippet[] = [];
  const pickedPaths = new Set<string>();
  const byArea = new Map<RepoArea, ScoredFile[]>();

  for (const row of ranked) {
    const list = byArea.get(row.area) ?? [];
    list.push(row);
    byArea.set(row.area, list);
  }

  for (const [area, limit] of Object.entries(quotas) as Array<[RepoArea, number]>) {
    const pool = byArea.get(area) ?? [];
    for (const row of pool) {
      if (picked.length >= maxFiles || pickedPaths.size >= maxFiles) break;
      if (picked.filter((f) => classifyRepoPath(f.path) === area).length >= limit) break;
      if (pickedPaths.has(row.file.path)) continue;
      picked.push(row.file);
      pickedPaths.add(row.file.path);
    }
  }

  for (const row of ranked) {
    if (picked.length >= maxFiles) break;
    if (pickedPaths.has(row.file.path)) continue;
    picked.push(row.file);
    pickedPaths.add(row.file.path);
  }

  return picked;
}

export function selectRelevantFiles(message: string, files: LoadedFileSnippet[], maxFiles = 48): LoadedFileSnippet[] {
  if (files.length === 0) return [];
  const ranked = rankFiles(message, files);
  if (ranked.length === 0) return files.slice(0, maxFiles);

  const n = message.toLowerCase();
  const hudNav = isHudOrNavigationReview(n);
  const broadReview = isBroadCodebaseReview(n);
  const excludeTests = excludesTests(n);

  if (hudNav) {
    return pickWithQuotas(ranked, maxFiles, {
      mobile: Math.min(32, maxFiles - 8),
      backend: 6,
      frontend: 4,
      docs: 2,
      tests: excludeTests ? 0 : 4
    });
  }

  if (broadReview) {
    return pickWithQuotas(ranked, maxFiles, {
      mobile: 16,
      frontend: 8,
      backend: 16,
      docs: 3,
      config: 2,
      tests: excludeTests ? 0 : 5,
      other: 3
    });
  }

  const top = ranked.slice(0, maxFiles).map((row) => row.file);
  if (top.length >= 3) return top;

  const fallbackHints = [
    "agents.md",
    "mapscreen",
    "turncard",
    "navigation",
    "app/backend/routes",
    "app/backend/services",
    "app/mobile/src",
    "app/frontend/src"
  ];
  const fallback = files.filter(
    (f) => !isTestPath(f.path) && fallbackHints.some((h) => f.path.toLowerCase().includes(h))
  );
  return [...new Map([...top, ...fallback].map((f) => [f.path, f])).values()].slice(0, maxFiles);
}

export function isBroadReviewMessage(message: string): boolean {
  return isBroadCodebaseReview(message.toLowerCase());
}

export function isHudReviewMessage(message: string): boolean {
  return isHudOrNavigationReview(message.toLowerCase());
}

export interface ReviewBatchPlan {
  batches: LoadedFileSnippet[][];
  rankedSourceCount: number;
  deepReadCap: number;
}

/** Area-aware paging: each batch pulls the next slice from mobile, backend, frontend, etc. */
export function selectReviewBatches(
  message: string,
  files: LoadedFileSnippet[],
  batchSize: number,
  maxBatches: number
): ReviewBatchPlan {
  const ranked = rankFiles(message, files);
  if (ranked.length === 0) {
    return { batches: [], rankedSourceCount: 0, deepReadCap: 0 };
  }

  const n = message.toLowerCase();
  const hudNav = isHudOrNavigationReview(n);
  const excludeTests = excludesTests(n);

  const areaOrder: RepoArea[] = hudNav
    ? ["mobile", "backend", "frontend", "docs", "config", "other"]
    : ["mobile", "backend", "frontend", "docs", "config", "other", "tests"];

  const pools = new Map<RepoArea, LoadedFileSnippet[]>();
  for (const row of ranked) {
    if (excludeTests && row.area === "tests") continue;
    const list = pools.get(row.area) ?? [];
    list.push(row.file);
    pools.set(row.area, list);
  }

  const activeAreas = areaOrder.filter((area) => (pools.get(area)?.length ?? 0) > 0);
  const cursors = new Map<RepoArea, number>();
  const batches: LoadedFileSnippet[][] = [];
  const perArea = Math.max(4, Math.ceil(batchSize / Math.max(activeAreas.length, 1)));

  while (batches.length < maxBatches) {
    const batch: LoadedFileSnippet[] = [];
    for (const area of activeAreas) {
      const pool = pools.get(area) ?? [];
      const cursor = cursors.get(area) ?? 0;
      batch.push(...pool.slice(cursor, cursor + perArea));
      cursors.set(area, cursor + perArea);
    }
    if (batch.length === 0) break;
    batches.push(batch.slice(0, batchSize));
  }

  const deepReadCap = batches.reduce((sum, batch) => sum + batch.length, 0);
  const rankedSourceCount = ranked.filter((row) => !(excludeTests && row.area === "tests")).length;

  return { batches, rankedSourceCount, deepReadCap };
}

export interface RepoPathIndex {
  totalFiles: number;
  deepReadCount: number;
  shallowPathCount: number;
  byArea: Record<string, { count: number; samples: string[] }>;
}

export function buildRepoPathIndex(allFiles: LoadedFileSnippet[], deepReadPaths: Set<string>): RepoPathIndex {
  const byArea: RepoPathIndex["byArea"] = {};

  for (const file of allFiles) {
    const area = classifyRepoPath(file.path);
    const bucket = byArea[area] ?? { count: 0, samples: [] };
    bucket.count += 1;
    if (bucket.samples.length < 6) bucket.samples.push(file.path);
    byArea[area] = bucket;
  }

  return {
    totalFiles: allFiles.length,
    deepReadCount: deepReadPaths.size,
    shallowPathCount: Math.max(0, allFiles.length - deepReadPaths.size),
    byArea
  };
}

export function formatRepoPathIndex(index: RepoPathIndex): string {
  const lines = [
    `Repository index: ${index.totalFiles} files total; ${index.deepReadCount} deep-read in this review; ${index.shallowPathCount} path-only.`
  ];
  for (const [area, meta] of Object.entries(index.byArea).sort((a, b) => b[1].count - a[1].count)) {
    lines.push(`- ${area}: ${meta.count} files (e.g. ${meta.samples.slice(0, 3).join(", ")})`);
  }
  return lines.join("\n");
}
