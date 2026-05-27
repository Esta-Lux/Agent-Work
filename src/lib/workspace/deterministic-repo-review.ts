import {
  buildRepoPathIndex,
  classifyRepoPath,
  formatRepoPathIndex,
  selectRelevantFiles,
  type LoadedFileSnippet,
  type RepoArea
} from "@/lib/workspace/file-ranking";

interface Finding {
  area: RepoArea | "security" | "deployment" | "brain";
  title: string;
  severity: "high" | "medium" | "low";
  paths: string[];
  detail: string;
}

export function buildDeterministicRepoReview(input: {
  message: string;
  files: LoadedFileSnippet[];
  projectName?: string;
}): {
  reply: string;
  deepReadFiles: LoadedFileSnippet[];
  findings: Finding[];
  coverageSummary: string;
} {
  const deepReadFiles = selectRelevantFiles(input.message, input.files, 72);
  const deepReadPaths = new Set(deepReadFiles.map((file) => file.path));
  const index = buildRepoPathIndex(input.files, deepReadPaths);
  const findings = buildFindings(input.files);
  const projectName = input.projectName?.trim() || inferProjectName(input.files) || "this project";

  const grouped = findings.reduce<Record<string, Finding[]>>((acc, finding) => {
    const bucket = acc[finding.area] ?? [];
    bucket.push(finding);
    acc[finding.area] = bucket;
    return acc;
  }, {});

  const sections = [
    `ARCHITECTURAL READ`,
    `BootRise indexed ${input.files.length} files for ${projectName} and fast-reviewed ${deepReadFiles.length} high-signal files. This is a fast control-layer review, not a full model-backed deep review.`,
    "",
    formatRepoPathIndex(index),
    "",
    "ISSUES, RISKS, AND GAPS",
    ...Object.entries(grouped).flatMap(([area, items]) => [
      "",
      area.toUpperCase(),
      ...items.slice(0, 6).map((finding, idx) => formatFinding(idx + 1, finding))
    ]),
    "",
    "NEXT SAFE ACTION",
    "1. Pick one finding and run Fix so BootRise can create a scope contract, allowed files, patch guard, and verification plan.",
    "2. Use Deep mode for a slower model-backed review if you want narrative reasoning across more file excerpts.",
    "3. Open Project Brain to confirm modules/rules after import; corrections there become durable memory."
  ];

  return {
    reply: sections.join("\n"),
    deepReadFiles,
    findings,
    coverageSummary: `Fast repo review: ${deepReadFiles.length} high-signal files selected from ${input.files.length} imported files`
  };
}

function buildFindings(files: LoadedFileSnippet[]): Finding[] {
  const paths = files.map((file) => file.path);
  const byArea = countByArea(paths);
  const findings: Finding[] = [];

  const backendRoutes = pick(paths, /app\/backend\/routes\/.*\.py$/i, 8);
  const backendTests = pick(paths, /app\/backend\/tests\/|app\/backend\/.*test.*\.py$/i, 8);
  if (backendRoutes.length > 0) {
    findings.push({
      area: "backend",
      title: "Large backend API surface needs route-level auth and smoke coverage.",
      severity: backendTests.length > 0 ? "medium" : "high",
      paths: [...backendRoutes.slice(0, 4), ...backendTests.slice(0, 2)],
      detail: `${backendRoutes.length}+ route files are present. Verify auth, ownership, and response-shape tests around high-risk routes before shipping fixes.`
    });
  }

  const mobileNav = pick(paths, /app\/mobile\/src\/navigation\/|app\/mobile\/src\/components\/navigation\/|app\/mobile\/src\/screens\/MapScreen\.tsx/i, 10);
  if (mobileNav.length > 0) {
    findings.push({
      area: "mobile",
      title: "Navigation/HUD is a high-coupling area.",
      severity: "high",
      paths: mobileNav.slice(0, 6),
      detail: "Turn cards, lane guidance, camera behavior, and route progress are spread across several mobile files. Any visual fix needs targeted regression checks."
    });
  }

  const frontendDriver = pick(paths, /app\/frontend\/src\/pages\/DriverApp\/components\/.*\.tsx$/i, 8);
  if (frontendDriver.length > 0) {
    findings.push({
      area: "frontend",
      title: "Driver web portal duplicates mobile product surfaces.",
      severity: "medium",
      paths: frontendDriver.slice(0, 5),
      detail: "Rewards, map, route, friend, and driver components exist in web and mobile. Fixes must check whether the same behavior exists in both surfaces."
    });
  }

  const sql = pick(paths, /app\/backend\/sql\/.*\.sql$/i, 8);
  const rls = pick(paths, /rls|supabase|auth|admin|payments|stripe/i, 10);
  if (sql.length > 0 || rls.length > 0) {
    findings.push({
      area: "security",
      title: "Database/auth/payment files require expanded approval.",
      severity: "high",
      paths: [...sql.slice(0, 3), ...rls.slice(0, 4)],
      detail: "BootRise should block casual edits here until the Lead Architect confirms ownership rules, RLS, webhook signatures, and rollback path."
    });
  }

  const docs = pick(paths, /SNAPROAD_ARCHITECTURE|LAUNCH_READINESS|ROLLBACK|SECRET_ROTATION|SENTRY|AGENTS\.md|README\.md/i, 10);
  if (docs.length > 0) {
    findings.push({
      area: "docs",
      title: "Important architecture/runbook knowledge exists but must feed Project Brain.",
      severity: "medium",
      paths: docs.slice(0, 6),
      detail: "These files should become durable memory rules so the agent does not rediscover deployment, security, and architecture decisions on every prompt."
    });
  }

  const packageFiles = pick(paths, /(^|\/)package\.json$/i, 8);
  const workflows = pick(paths, /\.github\/workflows\/.*\.ya?ml$/i, 8);
  if (packageFiles.length > 1 || workflows.length > 0) {
    findings.push({
      area: "deployment",
      title: "Monorepo verification likely needs per-app commands.",
      severity: "medium",
      paths: [...packageFiles.slice(0, 4), ...workflows.slice(0, 3)],
      detail: "A single root build is unlikely to prove mobile, backend, and frontend health. Safe-to-PR should run targeted commands by package."
    });
  }

  const testCount = byArea.tests ?? 0;
  const sourceCount = (byArea.mobile ?? 0) + (byArea.frontend ?? 0) + (byArea.backend ?? 0);
  if (sourceCount > 0) {
    findings.push({
      area: "tests",
      title: "Test surface should be evaluated by user flow, not just file count.",
      severity: testCount / sourceCount < 0.2 ? "medium" : "low",
      paths: pick(paths, /test|spec|e2e|pytest/i, 6),
      detail: `${testCount} test-like files were found against ${sourceCount} app/backend/frontend files. The next step is mapping tests to critical flows, not adding random tests.`
    });
  }

  return findings;
}

function formatFinding(index: number, finding: Finding): string {
  const pathLine = finding.paths.length ? `\n   Evidence: ${finding.paths.slice(0, 6).join(", ")}` : "";
  return `${index}. [${finding.severity}] ${finding.title}\n   ${finding.detail}${pathLine}`;
}

function pick(paths: string[], pattern: RegExp, limit: number): string[] {
  return paths.filter((path) => pattern.test(path)).slice(0, limit);
}

function countByArea(paths: string[]): Partial<Record<RepoArea, number>> {
  const counts: Partial<Record<RepoArea, number>> = {};
  for (const path of paths) {
    const area = classifyRepoPath(path);
    counts[area] = (counts[area] ?? 0) + 1;
  }
  return counts;
}

function inferProjectName(files: LoadedFileSnippet[]): string | null {
  const appJson = files.find((file) => /(^|\/)app\.json$/i.test(file.path));
  if (appJson) {
    const match = appJson.content.match(/"name"\s*:\s*"([^"]+)"/);
    if (match?.[1]) return match[1];
  }
  const readme = files.find((file) => /(^|\/)README\.md$/i.test(file.path));
  const title = readme?.content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return title ?? null;
}
