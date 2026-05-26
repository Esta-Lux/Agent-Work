import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";

export interface VisualSmokeRoute {
  path: string;
  label: string;
}

export interface VisualSmokeResult {
  enabled: boolean;
  status: "passed" | "failed" | "skipped";
  routes: VisualSmokeRoute[];
  checks: Array<{ route: string; ok: boolean; statusCode?: number; error?: string }>;
  message: string;
}

function visualSmokeEnabled(): boolean {
  const flag = process.env.BOOTRISE_VISUAL_SMOKE?.trim();
  return flag === "1" || flag === "true";
}

export function discoverWebRoutes(files: SourceFileInput[]): VisualSmokeRoute[] {
  const routes: VisualSmokeRoute[] = [{ path: "/", label: "Home" }];
  const seen = new Set<string>(["/"]);

  for (const file of files) {
    const match = file.path.match(/(?:^|\/)app\/(.*)\/page\.(tsx|jsx|ts|js)$/);
    if (!match) continue;
    const segments = match[1]
      .split("/")
      .filter((segment) => !segment.startsWith("(") && segment !== "page");
    const routePath = segments.length === 0 ? "/" : `/${segments.join("/")}`;
    if (seen.has(routePath)) continue;
    seen.add(routePath);
    routes.push({ path: routePath, label: routePath === "/" ? "Home" : routePath });
  }

  for (const file of files) {
    if (!file.path.endsWith("index.html")) continue;
    if (!seen.has("/")) routes.unshift({ path: "/", label: "Static index" });
  }

  return routes.slice(0, 12);
}

export async function runVisualSmoke(
  baseUrl: string,
  files: SourceFileInput[],
  sandboxRoot: string
): Promise<VisualSmokeResult> {
  const routes = discoverWebRoutes(files);

  if (!visualSmokeEnabled()) {
    return {
      enabled: false,
      status: "skipped",
      routes,
      checks: [],
      message: "Set BOOTRISE_VISUAL_SMOKE=1 to enable Playwright route smoke checks."
    };
  }

  let playwright: typeof import("playwright");
  try {
    playwright = await import("playwright");
  } catch {
    return {
      enabled: true,
      status: "skipped",
      routes,
      checks: [],
      message: "Playwright not installed. Run: npm install -D playwright && npx playwright install chromium"
    };
  }

  const resolvedUrl = await resolveSmokeBaseUrl(baseUrl, sandboxRoot, files);
  if (!resolvedUrl) {
    return {
      enabled: true,
      status: "skipped",
      routes,
      checks: [],
      message: "No reachable preview URL for visual smoke. Enable BOOTRISE_PREVIEW_DEV or pass a running dev server."
    };
  }

  const checks: VisualSmokeResult["checks"] = [];
  let browser: Awaited<ReturnType<typeof playwright.chromium.launch>> | null = null;

  try {
    browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    for (const route of routes) {
      const url = `${resolvedUrl.replace(/\/$/, "")}${route.path === "/" ? "/" : route.path}`;
      try {
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
        const statusCode = response?.status() ?? 0;
        const bodyText = await page.locator("body").innerText().catch(() => "");
        const ok = statusCode >= 200 && statusCode < 400 && bodyText.trim().length > 0;
        checks.push({ route: route.path, ok, statusCode });
      } catch (error) {
        checks.push({
          route: route.path,
          ok: false,
          error: error instanceof Error ? error.message : "Navigation failed"
        });
      }
    }

    await context.close();
  } finally {
    await browser?.close().catch(() => undefined);
  }

  const failed = checks.filter((check) => !check.ok);
  return {
    enabled: true,
    status: failed.length === 0 && checks.length > 0 ? "passed" : checks.length === 0 ? "skipped" : "failed",
    routes,
    checks,
    message:
      failed.length === 0
        ? `Visual smoke passed for ${checks.length} route(s) at ${resolvedUrl}.`
        : `Visual smoke failed on ${failed.map((f) => f.route).join(", ")}.`
  };
}

async function resolveSmokeBaseUrl(
  baseUrl: string,
  sandboxRoot: string,
  files: SourceFileInput[]
): Promise<string | null> {
  if (baseUrl.startsWith("http")) {
    try {
      const res = await fetch(baseUrl, { method: "HEAD" });
      if (res.ok || res.status < 500) return baseUrl;
    } catch {
      // fall through
    }
  }

  const indexCandidates = ["index.html", "app/frontend/index.html", "public/index.html"];
  for (const candidate of indexCandidates) {
    const full = join(sandboxRoot, candidate);
    if (existsSync(full)) {
      return `file://${full}`;
    }
  }

  const hasNext = files.some((f) => f.path.includes("next.config"));
  if (hasNext) {
    return process.env.BOOTRISE_VISUAL_SMOKE_URL?.trim() || null;
  }

  return null;
}

export function readPackageJsonScripts(root: string, prefix: string): Record<string, string> {
  const path = join(root, prefix, "package.json");
  if (!existsSync(path)) return {};
  try {
    const pkg = JSON.parse(readFileSync(path, "utf8")) as { scripts?: Record<string, string> };
    return pkg.scripts ?? {};
  } catch {
    return {};
  }
}
