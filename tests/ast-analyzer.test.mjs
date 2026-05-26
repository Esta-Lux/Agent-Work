import test from "node:test";
import assert from "node:assert/strict";
import { analyzeTypeScriptAst } from "../src/lib/intelligence/ast-analyzer.ts";

test("analyzeTypeScriptAst extracts exports, re-exports, and call dependencies", () => {
  const source = `
import { getSession } from "./auth";
export { validateToken } from "./auth";
export function useAuth() {
  const session = getSession();
  return validateLocal(session);
}
function validateLocal(session: unknown) {
  return Boolean(session);
}
export const Page = () => null;
`;

  const result = analyzeTypeScriptAst("src/hooks/useAuth.ts", source);

  assert.ok(result.symbols.some((s) => s.name === "useAuth" && s.exported));
  assert.ok(result.symbols.some((s) => s.name === "validateToken" && s.exported));
  assert.ok(result.symbols.some((s) => s.name === "Page" && s.exported));

  const useAuthDeps = result.symbolDependencies.find((s) => s.symbolName === "useAuth");
  assert.ok(useAuthDeps);
  assert.ok(useAuthDeps.dependencies.includes("getSession"));
  assert.ok(useAuthDeps.dependencies.includes("validateLocal"));

  assert.ok(result.dependencies.some((d) => d.to === "./auth"));
  assert.ok(result.callEdges.some((d) => d.to === "getSession"));
});

test("analyzeTypeScriptAst detects Next.js route files", () => {
  const source = `export async function GET() { return Response.json({ ok: true }); }`;
  const result = analyzeTypeScriptAst("src/app/api/health/route.ts", source);
  assert.ok(result.symbols.some((s) => s.kind === "route"));
});
