import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { classifyRepoPath, isTestPath } from "@/lib/workspace/file-ranking";

export interface RepositoryMap {
  apps: string[];
  routes: string[];
  apiEndpoints: string[];
  dataModels: string[];
  authBoundaries: string[];
  envFiles: string[];
  testPaths: string[];
  highRiskFiles: string[];
  dependencies: string[];
  summary: string;
}

const ROUTE_HINTS = ["/route.ts", "/routes/", "router", "pages/", "app/api/"];
const MODEL_HINTS = ["/models/", "/model.", "schema", "prisma", "drizzle", "sqlalchemy"];
const AUTH_HINTS = ["auth", "login", "session", "jwt", "middleware"];
const HIGH_RISK = ["billing", "payment", "stripe", "migration", ".env", "credentials", "secret"];

export function buildRepositoryMap(files: SourceFileInput[]): RepositoryMap {
  const apps = new Set<string>();
  const routes = new Set<string>();
  const apiEndpoints = new Set<string>();
  const dataModels = new Set<string>();
  const authBoundaries = new Set<string>();
  const envFiles: string[] = [];
  const testPaths: string[] = [];
  const highRiskFiles: string[] = [];
  const dependencies = new Set<string>();

  for (const file of files) {
    const p = file.path;
    const area = classifyRepoPath(p);
    if (area === "mobile" || area === "frontend" || area === "backend") {
      apps.add(area);
    }
    if (isTestPath(p)) testPaths.push(p);
    if (/\.env/i.test(p) || p.includes("credentials")) envFiles.push(p);

    if (ROUTE_HINTS.some((h) => p.toLowerCase().includes(h))) routes.add(p);
    if (p.includes("app/api/") || /routes\/.*\.py$/i.test(p)) apiEndpoints.add(p);
    if (MODEL_HINTS.some((h) => p.toLowerCase().includes(h))) dataModels.add(p);
    if (AUTH_HINTS.some((h) => p.toLowerCase().includes(h))) authBoundaries.add(p);
    if (HIGH_RISK.some((h) => p.toLowerCase().includes(h))) highRiskFiles.push(p);

    if (p.endsWith("package.json")) {
      try {
        const pkg = JSON.parse(file.content) as { dependencies?: Record<string, string> };
        for (const name of Object.keys(pkg.dependencies ?? {})) dependencies.add(name);
      } catch {
        /* ignore */
      }
    }
  }

  const summary = [
    `${files.length} files indexed.`,
    `Apps: ${[...apps].join(", ") || "unknown"}.`,
    `${routes.size} route/screen paths · ${apiEndpoints.size} API modules · ${dataModels.size} model areas.`,
    `${highRiskFiles.length} high-risk paths (auth/billing/env/migrations).`
  ].join(" ");

  return {
    apps: [...apps],
    routes: [...routes].slice(0, 40),
    apiEndpoints: [...apiEndpoints].slice(0, 40),
    dataModels: [...dataModels].slice(0, 30),
    authBoundaries: [...authBoundaries].slice(0, 30),
    envFiles: envFiles.slice(0, 10),
    testPaths: testPaths.slice(0, 30),
    highRiskFiles: highRiskFiles.slice(0, 20),
    dependencies: [...dependencies].slice(0, 40),
    summary
  };
}
