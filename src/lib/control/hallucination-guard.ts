import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";
import type { ControlFinding } from "@/lib/control/types";
import {
  buildRepoSchemaIndex,
  routeExistsInIndex,
  tableExistsInIndex
} from "@/lib/control/repo-schema-index";
import { runDuplicateLogicGuard } from "@/lib/control/duplicate-logic-guard";

const IMPORT_RE =
  /import\s+(?:type\s+)?(?:\{[^}]+\}|[\w*]+)\s+from\s+["']([^"']+)["']|from\s+([\w.]+)\s+import/g;
const REQUIRE_RE = /require\(["']([^"']+)["']\)/g;

export function runHallucinationGuard(
  patches: ProposedPatch[],
  corpus: SourceFileInput[]
): ControlFinding[] {
  const findings: ControlFinding[] = [];
  const paths = new Set(corpus.map((f) => f.path));
  const pathLower = new Map(corpus.map((f) => [f.path.toLowerCase(), f.path]));
  const symbolIndex = buildSymbolIndex(corpus);
  const installedPackages = extractInstalledPackages(corpus);
  const schemaIndex = buildRepoSchemaIndex(corpus);

  for (const patch of patches) {
    if (!paths.has(patch.path)) {
      findings.push({
        id: `missing-path:${patch.path}`,
        severity: "block",
        category: "hallucination",
        message: `Patch targets ${patch.path} which is not in the imported corpus.`,
        path: patch.path
      });
    }

    const combined = `${patch.after}\n${patch.summary}`;
    for (const spec of extractImportSpecifiers(combined)) {
      if (spec.startsWith(".") || spec.startsWith("@/")) {
        const resolved = resolveRelative(patch.path, spec, paths, pathLower);
        if (!resolved) {
          findings.push({
            id: `bad-import:${patch.path}:${spec}`,
            severity: "block",
            category: "hallucination",
            message: `Import "${spec}" from ${patch.path} does not resolve to a file in the repo.`,
            path: patch.path
          });
        }
      }
    }

    for (const symbol of extractCalledSymbols(combined)) {
      if (symbolIndex.has(symbol)) continue;
      if (/^(use[A-Z]|console|Math|JSON|Array|Object|String|Number|Boolean)$/.test(symbol)) continue;
      if (combined.includes(`function ${symbol}`) || combined.includes(`const ${symbol}`)) continue;
      const similar = findSimilarSymbol(symbol, symbolIndex);
      findings.push({
        id: `unknown-symbol:${patch.path}:${symbol}`,
        severity: similar ? "block" : "warning",
        category: "hallucination",
        message: similar
          ? `AI referenced ${symbol}, but no such symbol exists. Existing similar: ${similar}. Patch blocked.`
          : `Patch in ${patch.path} references "${symbol}" — not found in indexed symbols (may be new or external).`,
        path: patch.path
      });
    }

    for (const pkg of extractBareNpmImports(combined)) {
      if (installedPackages.has(pkg) || pkg.startsWith("node:")) continue;
      findings.push({
        id: `npm:${patch.path}:${pkg}`,
        severity: "block",
        category: "hallucination",
        message: `Package "${pkg}" is not listed in package.json for this repo.`,
        path: patch.path
      });
    }

    for (const route of extractApiRouteRefs(combined)) {
      if (schemaIndex.apiPaths.size === 0) continue;
      if (!routeExistsInIndex(schemaIndex, route) && !combined.includes(`@router`) && !combined.includes("router.")) {
        findings.push({
          id: `fake-route:${patch.path}:${route}`,
          severity: "block",
          category: "hallucination",
          message: `API route "${route}" is not in the indexed route table for this repo.`,
          path: patch.path
        });
      }
    }

    for (const table of extractTableRefs(combined)) {
      if (schemaIndex.dbTables.size === 0) continue;
      if (!tableExistsInIndex(schemaIndex, table)) {
        findings.push({
          id: `fake-table:${patch.path}:${table}`,
          severity: "block",
          category: "hallucination",
          message: `Database table "${table}" is not in indexed schema/migrations.`,
          path: patch.path
        });
      }
    }

    for (const envVar of extractEnvRefs(combined)) {
      if (schemaIndex.documentedEnvVars.size === 0) continue;
      if (!schemaIndex.documentedEnvVars.has(envVar) && !/^(NODE_ENV|PATH)$/.test(envVar)) {
        findings.push({
          id: `env:${patch.path}:${envVar}`,
          severity: "warning",
          category: "hallucination",
          message: `Env var ${envVar} is not documented in .env.example — verify before merge.`,
          path: patch.path
        });
      }
    }

    for (const cmd of extractTestCommandRefs(combined)) {
      if (schemaIndex.testCommands.size === 0) continue;
      const known = [...schemaIndex.testCommands].some((k) => cmd.includes(k) || k.includes(cmd));
      if (!known && /\b(npm test|pytest|jest)\b/i.test(cmd)) {
        findings.push({
          id: `fake-test-cmd:${patch.path}`,
          severity: "warning",
          category: "hallucination",
          message: `Test command "${cmd}" is not present in package.json scripts.`,
          path: patch.path
        });
      }
    }
  }

  findings.push(...runDuplicateLogicGuard(patches, corpus));
  return findings;
}

function extractApiRouteRefs(source: string): string[] {
  const routes = new Set<string>();
  for (const match of source.matchAll(/fetch\(\s*["'](\/[^"']+)["']/g)) routes.add(match[1]);
  for (const match of source.matchAll(/["'](\/api\/[^"']+)["']/g)) routes.add(match[1]);
  return [...routes];
}

function extractTableRefs(source: string): string[] {
  const tables = new Set<string>();
  for (const match of source.matchAll(/FROM\s+(\w+)/gi)) {
    tables.add(match[1]);
  }
  for (const match of source.matchAll(/INTO\s+(\w+)/gi)) {
    tables.add(match[1]);
  }
  return [...tables].filter((t) => !/^(select|where|and)$/i.test(t));
}

function extractEnvRefs(source: string): string[] {
  const vars = new Set<string>();
  for (const match of source.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) vars.add(match[1]);
  for (const match of source.matchAll(/os\.environ\[[\"']([A-Z][A-Z0-9_]+)[\"']\]/g)) vars.add(match[1]);
  return [...vars];
}

function extractTestCommandRefs(source: string): string[] {
  const cmds: string[] = [];
  for (const match of source.matchAll(/`(npm test[^`]*)`/g)) cmds.push(match[1]);
  for (const match of source.matchAll(/`(pytest[^`]*)`/g)) cmds.push(match[1]);
  return cmds;
}

function extractBareNpmImports(source: string): string[] {
  const specs: string[] = [];
  for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) {
    const spec = match[1];
    if (!spec.startsWith(".") && !spec.startsWith("@/")) {
      specs.push(spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]);
    }
  }
  return specs;
}

function findSimilarSymbol(name: string, index: Set<string>): string | null {
  const lower = name.toLowerCase();
  for (const candidate of index) {
    if (candidate === name) return candidate;
    if (candidate.toLowerCase().includes(lower.slice(0, Math.max(4, lower.length - 2)))) return candidate;
    if (lower.startsWith("use") && candidate.startsWith("use") && levenshtein(lower, candidate.toLowerCase()) <= 4) {
      return candidate;
    }
  }
  return null;
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

function extractInstalledPackages(corpus: SourceFileInput[]): Set<string> {
  const packages = new Set<string>();
  for (const file of corpus) {
    if (!file.path.endsWith("package.json")) continue;
    try {
      const pkg = JSON.parse(file.content) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      for (const name of Object.keys(pkg.dependencies ?? {})) packages.add(name);
      for (const name of Object.keys(pkg.devDependencies ?? {})) packages.add(name);
    } catch {
      /* ignore */
    }
  }
  return packages;
}

function buildSymbolIndex(corpus: SourceFileInput[]): Set<string> {
  const symbols = new Set<string>();
  for (const file of corpus) {
    for (const match of file.content.matchAll(
      /export\s+(?:default\s+)?(?:async\s+)?(?:function|const|class|type|interface)\s+([A-Za-z0-9_]+)/g
    )) {
      symbols.add(match[1]);
    }
    for (const match of file.content.matchAll(/export\s*\{\s*([^}]+)\s*\}/g)) {
      for (const part of match[1].split(",")) {
        const name = part.trim().split(/\s+as\s+/)[0]?.trim();
        if (name) symbols.add(name);
      }
    }
  }
  return symbols;
}

function extractImportSpecifiers(source: string): string[] {
  const specs: string[] = [];
  for (const match of source.matchAll(IMPORT_RE)) {
    const spec = match[1] ?? match[2];
    if (spec) specs.push(spec);
  }
  for (const match of source.matchAll(REQUIRE_RE)) {
    specs.push(match[1]);
  }
  return specs;
}

function extractCalledSymbols(source: string): string[] {
  const names = new Set<string>();
  for (const match of source.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)) {
    names.add(match[1]);
  }
  return Array.from(names);
}

function resolveRelative(
  from: string,
  spec: string,
  paths: Set<string>,
  pathLower: Map<string, string>
): string | null {
  const fromDir = from.split("/").slice(0, -1);
  const joined = normalizePath([...fromDir, ...spec.split("/")]);
  if (paths.has(joined)) return joined;
  for (const ext of [".ts", ".tsx", ".js", ".jsx", ".py"]) {
    if (paths.has(`${joined}${ext}`)) return `${joined}${ext}`;
    const index = `${joined}/index${ext}`;
    if (paths.has(index)) return index;
  }
  const fuzzy = [...pathLower.keys()].find((p) => p.endsWith(`/${spec.replace(/^\.\//, "")}`));
  return fuzzy ? pathLower.get(fuzzy)! : null;
}

function normalizePath(parts: string[]): string {
  const stack: string[] = [];
  for (const part of parts) {
    if (part === "..") stack.pop();
    else if (part !== "." && part) stack.push(part);
  }
  return stack.join("/");
}
