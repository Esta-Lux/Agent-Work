import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const USER = { id: "admin-test", email: "admin@bootrise.local" };

function setupRepo() {
  const root = mkdtempSync(join(tmpdir(), "bootrise-detections-scanner-"));
  mkdirSync(join(root, "src", "app", "api", "workspace", "foo"), { recursive: true });
  mkdirSync(join(root, "src", "lib", "workspace"), { recursive: true });
  mkdirSync(join(root, "src", "components"), { recursive: true });
  mkdirSync(join(root, ".bootrise", "admin"), { recursive: true });

  writeFileSync(
    join(root, "src", "app", "api", "workspace", "foo", "route.ts"),
    "export async function POST(req) { return new Response('ok'); }\n"
  );
  writeFileSync(
    join(root, "src", "lib", "workspace", "leaky.ts"),
    "import { writeFileSync } from 'node:fs';\nexport function writeStuff(payload) { writeFileSync('out.json', payload); }\n"
  );
  writeFileSync(
    join(root, "src", "components", "workspace-x.tsx"),
    '"use client";\nimport { secret } from "@/lib/workspace/leaky.server";\nexport function X() { return null; }\n'
  );
  return root;
}

test("detections scanner fires expected rules and emits only scalar evidence values", async () => {
  const originalCwd = process.cwd();
  const root = setupRepo();
  process.env.BOOTRISE_SELF_REPO_ROOT = root;
  process.chdir(root);

  try {
    const { updateKillSwitches } = await import("../src/lib/admin/kill-switches.ts");
    const { runDetectionsScan } = await import("../src/lib/admin/detections/scanner.ts");
    updateKillSwitches({ disableDetectionsScanner: false, disableAdminAgent: false });

    const result = await runDetectionsScan({ user: USER, orgId: "org-test" });
    assert.ok(result.detections.length >= 3, `expected >=3 detections, got ${result.detections.length}`);

    const kinds = new Set(result.detections.map((d) => d.kind));
    assert.ok(kinds.has("auth_missing"), "expected auth_missing detection");
    assert.ok(kinds.has("audit_log_missing"), "expected audit_log_missing detection");
    assert.ok(kinds.has("client_server_boundary"), "expected client_server_boundary detection");

    for (const detection of result.detections) {
      if (!detection.evidence) continue;
      for (const value of Object.values(detection.evidence)) {
        assert.ok(typeof value === "string" || typeof value === "number");
        if (typeof value === "string") {
          assert.ok(value.length <= 240, `evidence value too long for ${detection.kind}`);
        }
      }
    }
  } finally {
    delete process.env.BOOTRISE_SELF_REPO_ROOT;
    process.chdir(originalCwd);
    rmSync(root, { recursive: true, force: true });
  }
});

test("detections scanner refuses when disableDetectionsScanner is set", async () => {
  const originalCwd = process.cwd();
  const root = setupRepo();
  process.env.BOOTRISE_SELF_REPO_ROOT = root;
  process.chdir(root);

  try {
    const { updateKillSwitches } = await import("../src/lib/admin/kill-switches.ts");
    const { runDetectionsScan } = await import("../src/lib/admin/detections/scanner.ts");
    updateKillSwitches({ disableDetectionsScanner: true });
    try {
      await assert.rejects(() => runDetectionsScan({ user: USER, orgId: "org-test" }), /detections scanner is disabled/i);
    } finally {
      updateKillSwitches({ disableDetectionsScanner: false });
    }
  } finally {
    delete process.env.BOOTRISE_SELF_REPO_ROOT;
    process.chdir(originalCwd);
    rmSync(root, { recursive: true, force: true });
  }
});
