import { createHash } from "node:crypto";

export interface FileSymbolIndex {
  path: string;
  language: "typescript" | "javascript" | "css" | "json" | "markdown" | "other";
  exports: string[];
  imports: string[];
  functions: string[];
  components: string[];
  classes: string[];
  apiRoutes: string[];
  databaseRefs: string[];
  envVarRefs: string[];
  authUsage: string[];
  billingUsage: string[];
  providerUsage: string[];
  relatedTestPaths: string[];
  purpose: string;
  riskLevel: "low" | "medium" | "high";
  knownFragileAreas: string[];
  hash: string;
}

export function buildFileSymbolIndex(file: { path: string; content: string }, allPaths: string[] = []): FileSymbolIndex {
  const content = file.content;
  return {
    path: file.path,
    language: inferLanguage(file.path),
    exports: matchAll(content, /export\s+(?:async\s+)?(?:function|class|const|type|interface)\s+([A-Za-z0-9_]+)/g),
    imports: matchAll(content, /from\s+["']([^"']+)["']/g),
    functions: matchAll(content, /function\s+([A-Za-z0-9_]+)/g),
    components: matchAll(content, /(?:function|const)\s+([A-Z][A-Za-z0-9_]*)/g),
    classes: matchAll(content, /class\s+([A-Za-z0-9_]+)/g),
    apiRoutes: /route\.ts$/.test(file.path) ? matchAll(content, /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)/g) : [],
    databaseRefs: matchAll(content, /\.from\(["']([^"']+)["']\)/g),
    envVarRefs: matchAll(content, /process\.env\.([A-Z0-9_]+)/g),
    authUsage: matchAll(content, /(requireAdmin|withAdminAuth|withWorkspaceAuth|requireAuth|resolveUserOrgContext)/g),
    billingUsage: matchAll(content, /(stripe|billing|credits|usage|checkout)/gi),
    providerUsage: matchAll(content, /(openai|nvidia|provider|model-router)/gi),
    relatedTestPaths: allPaths.filter((path) => path.includes(file.path.replace(/\.(tsx?|jsx?)$/, "")) && /\.test\./.test(path)),
    purpose: inferPurpose(file.path),
    riskLevel: inferRisk(file.path, content),
    knownFragileAreas: inferFragileAreas(file.path, content),
    hash: createHash("sha256").update(content).digest("hex")
  };
}

function matchAll(content: string, regex: RegExp): string[] {
  return [...content.matchAll(regex)].map((match) => match[1]).filter(Boolean);
}

function inferLanguage(path: string): FileSymbolIndex["language"] {
  if (/\.tsx?$/.test(path)) return "typescript";
  if (/\.jsx?$/.test(path)) return "javascript";
  if (/\.css$/.test(path)) return "css";
  if (/\.json$/.test(path)) return "json";
  if (/\.md$/.test(path)) return "markdown";
  return "other";
}

function inferPurpose(path: string): string {
  if (/\/api\/.*route\.ts$/.test(path)) return "API route";
  if (/components\//.test(path)) return "UI component";
  if (/lib\/auth/.test(path)) return "Authentication utility";
  if (/lib\/security/.test(path)) return "Security analysis";
  return "Repository source file";
}

function inferRisk(path: string, content: string): FileSymbolIndex["riskLevel"] {
  if (/auth|middleware|billing|stripe|supabase|migration|security/i.test(path)) return "high";
  if (/\/api\/|route\.ts|process\.env|admin/i.test(path) || /process\.env/.test(content)) return "medium";
  return "low";
}

function inferFragileAreas(path: string, content: string): string[] {
  return [
    /process\.env/.test(content) ? "Environment variables" : null,
    /withAdminAuth|requireAdmin/.test(content) ? "Admin auth boundary" : null,
    /withWorkspaceAuth|resolveUserOrgContext/.test(content) ? "Workspace auth boundary" : null,
    /supabase|migration/i.test(path + content) ? "Database access" : null
  ].filter((value): value is string => Boolean(value));
}
