import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";

export interface RepoSchemaIndex {
  httpRoutes: Set<string>;
  apiPaths: Set<string>;
  dbTables: Set<string>;
  documentedEnvVars: Set<string>;
  testCommands: Set<string>;
}

export function buildRepoSchemaIndex(corpus: SourceFileInput[]): RepoSchemaIndex {
  const httpRoutes = new Set<string>();
  const apiPaths = new Set<string>();
  const dbTables = new Set<string>();
  const documentedEnvVars = new Set<string>();
  const testCommands = new Set<string>();

  for (const file of corpus) {
    const content = file.content;

    if (/openapi|swagger/i.test(file.path) || content.includes("openapi")) {
      for (const match of content.matchAll(/"\/([^"]+)"/g)) {
        if (match[0].includes("/")) apiPaths.add(`/${match[1]}`);
      }
      for (const match of content.matchAll(/^\s*\/[\w/{}\-]+:/gm)) {
        apiPaths.add(match[0].replace(/:$/, "").trim());
      }
    }

    for (const match of content.matchAll(
      /@(?:app|router)\.(get|post|put|patch|delete)\(["']([^"']+)["']/gi
    )) {
      apiPaths.add(match[2]);
    }
    for (const match of content.matchAll(/@router\.(get|post|put|patch|delete)\(["']([^"']+)["']/gi)) {
      apiPaths.add(match[2]);
    }
    for (const match of content.matchAll(/router\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']/gi)) {
      apiPaths.add(match[2]);
    }

    if (file.path.includes("app/api/") || file.path.includes("/routes/")) {
      const routeMatch = file.path.match(/app\/api\/(.+)\/route\.(ts|js)/);
      if (routeMatch) apiPaths.add(`/api/${routeMatch[1].replace(/\/route$/, "")}`);
    }

    for (const match of content.matchAll(
      /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/g
    )) {
      httpRoutes.add(`${match[1]} ${file.path}`);
    }

    for (const match of content.matchAll(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?/gi
    )) {
      dbTables.add(match[1]);
    }
    for (const match of content.matchAll(/__tablename__\s*=\s*["'](\w+)["']/g)) {
      dbTables.add(match[1]);
    }
    for (const match of content.matchAll(/class\s+(\w+)\(.*Base.*\):/g)) {
      if (/models?|schema/i.test(file.path)) dbTables.add(snakeCase(match[1]));
    }

    if (/\.env\.example|\.env\.sample|env\.example/i.test(file.path)) {
      for (const match of content.matchAll(/^([A-Z][A-Z0-9_]+)=/gm)) {
        documentedEnvVars.add(match[1]);
      }
    }

    if (file.path.endsWith("package.json")) {
      try {
        const pkg = JSON.parse(content) as { scripts?: Record<string, string> };
        for (const cmd of Object.values(pkg.scripts ?? {})) {
          if (cmd.includes("test")) testCommands.add(cmd);
        }
      } catch {
        /* ignore */
      }
    }
  }

  return { httpRoutes, apiPaths, dbTables, documentedEnvVars, testCommands };
}

function snakeCase(name: string): string {
  return name.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
}

export function routeExistsInIndex(index: RepoSchemaIndex, path: string): boolean {
  if (index.apiPaths.has(path)) return true;
  return [...index.apiPaths].some((p) => path.startsWith(p) || p.startsWith(path));
}

export function tableExistsInIndex(index: RepoSchemaIndex, table: string): boolean {
  const lower = table.toLowerCase();
  return [...index.dbTables].some((t) => t.toLowerCase() === lower);
}
