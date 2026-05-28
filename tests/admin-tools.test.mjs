import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const USER = { id: "admin-test", email: "admin@bootrise.local" };

function setupRepo() {
  const root = mkdtempSync(join(tmpdir(), "bootrise-admin-tools-"));
  mkdirSync(join(root, "src", "app", "api", "foo"), { recursive: true });
  mkdirSync(join(root, "src", "app", "api", "proxy", "[sessionId]", "[[...path]]"), { recursive: true });
  mkdirSync(join(root, "src", "lib"), { recursive: true });
  mkdirSync(join(root, ".bootrise", "admin"), { recursive: true });
  writeFileSync(
    join(root, "src", "app", "api", "foo", "route.ts"),
    "export async function GET() { return new Response('ok'); }\n"
  );
  writeFileSync(
    join(root, "src", "app", "api", "proxy", "[sessionId]", "[[...path]]", "route.ts"),
    "export async function GET() { return new Response('proxy'); }\n"
  );
  writeFileSync(
    join(root, "src", "lib", "util.ts"),
    "export const beacon = 'unique-marker-xyz';\n"
  );
  writeFileSync(join(root, ".env"), "SECRET=should-be-denied\n");
  writeFileSync(join(root, ".env.example"), "OK=keep\n");
  return root;
}

test("admin tools enforce denylist, traversal block, and output cap", async () => {
  const originalCwd = process.cwd();
  const root = setupRepo();
  process.env.BOOTRISE_SELF_REPO_ROOT = root;
  process.chdir(root);

  try {
    const { loadCodebaseMemory } = await import("../src/lib/admin/codebase-memory.ts");
    const { readFileTool } = await import("../src/lib/admin/tools/read-file.ts");
    const { grepSymbolTool } = await import("../src/lib/admin/tools/grep-symbol.ts");
    const { listRoutesTool } = await import("../src/lib/admin/tools/list-routes.ts");
    const { capToolOutput } = await import("../src/lib/admin/tools/registry.ts");

    const memory = await loadCodebaseMemory({ refresh: true });
    const ctx = { repoRoot: root, user: USER, orgId: "org-test", memory };

    const read = await readFileTool.execute({ path: "src/lib/util.ts" }, ctx);
    assert.ok(read.content.includes("unique-marker-xyz"));
    assert.equal(read.path, "src/lib/util.ts");

    await assert.rejects(() => readFileTool.execute({ path: ".env" }, ctx), /denied/i);
    await assert.rejects(() => readFileTool.execute({ path: "../etc/passwd" }, ctx), /denied/i);
    await assert.rejects(() => readFileTool.execute({ path: "src/../etc/passwd" }, ctx), /denied/i);

    const dyn = await readFileTool.execute(
      { path: "src/app/api/proxy/[sessionId]/[[...path]]/route.ts" },
      ctx
    );
    assert.ok(dyn.content.includes("Response('proxy')"));

    const allowedExample = await readFileTool.execute({ path: ".env.example" }, ctx);
    assert.ok(allowedExample.content.includes("OK=keep"));

    const grep = await grepSymbolTool.execute({ query: "unique-marker-xyz" }, ctx);
    assert.ok(grep.textHits.length >= 1);
    assert.equal(grep.textHits[0].path, "src/lib/util.ts");

    const routes = await listRoutesTool.execute({}, ctx);
    assert.ok(routes.routes.some((r) => r.path === "/api/foo" && r.methods.includes("GET")));

    const big = "x".repeat(20000);
    const capped = capToolOutput({ blob: big });
    assert.equal(capped.truncated, true);
    assert.ok(typeof capped.value === "string");
    assert.ok(String(capped.value).endsWith("…[truncated]"));
  } finally {
    delete process.env.BOOTRISE_SELF_REPO_ROOT;
    process.chdir(originalCwd);
    rmSync(root, { recursive: true, force: true });
  }
});

test("admin shell tools refuse when disableAgentShell kill switch is set", async () => {
  const originalCwd = process.cwd();
  const root = setupRepo();
  process.env.BOOTRISE_SELF_REPO_ROOT = root;
  process.chdir(root);

  try {
    const { loadCodebaseMemory } = await import("../src/lib/admin/codebase-memory.ts");
    const { updateKillSwitches } = await import("../src/lib/admin/kill-switches.ts");
    const { runTypecheckTool } = await import("../src/lib/admin/tools/run-typecheck.ts");

    updateKillSwitches({ disableAgentShell: true });
    const memory = await loadCodebaseMemory({ refresh: true });
    const ctx = { repoRoot: root, user: USER, orgId: "org-test", memory };
    await assert.rejects(() => runTypecheckTool.execute({}, ctx), /agent shell|disabled/i);
    updateKillSwitches({ disableAgentShell: false });
  } finally {
    delete process.env.BOOTRISE_SELF_REPO_ROOT;
    process.chdir(originalCwd);
    rmSync(root, { recursive: true, force: true });
  }
});
