import assert from "node:assert/strict";
import test from "node:test";

test("resolveUserProvider defaults to bootrise", async () => {
  const { resolveUserProvider } = await import("../src/lib/ai/providers.ts");
  assert.equal(resolveUserProvider(), "bootrise");
  assert.equal(resolveUserProvider("bootrise"), "bootrise");
  assert.equal(resolveUserProvider("openai"), "openai");
});

test("resolveAdminProvider honors selection", async () => {
  const { resolveAdminProvider } = await import("../src/lib/ai/providers.ts");
  assert.equal(resolveAdminProvider("openai"), "openai");
  assert.equal(resolveAdminProvider("bootrise"), "bootrise");
  assert.equal(resolveAdminProvider("chatgpt"), "openai");
  assert.equal(resolveAdminProvider("ChatGPT"), "openai");
  assert.equal(resolveAdminProvider("gpt"), "openai");
  assert.equal(resolveAdminProvider("  OpenAI  "), "openai");
  assert.equal(resolveAdminProvider(undefined), "bootrise");
  assert.equal(resolveAdminProvider("nvidia"), "bootrise");
  assert.equal(resolveAdminProvider("typo"), "bootrise");
});

test("export bundle tags ai provider", async () => {
  const { createExportBundle } = await import("../src/lib/workspace/workspace-export.ts");
  const bundle = createExportBundle({
    projectBrief: {
      productName: "Demo",
      audience: "founders",
      primaryWorkflow: "paste code",
      authRequired: false,
      paymentsRequired: false,
      deploymentTarget: "vercel",
      constraints: [],
      longBuild: false
    },
    files: [{ path: "src/a.ts", content: "export const a = 1;" }],
    preferredProvider: "bootrise"
  });
  assert.equal(bundle.aiProvider, "bootrise");
  assert.equal(bundle.format, "bootrise-bundle-v1");
});

test("supabase config resolves project ref", async () => {
  process.env.SUPABASE_URL = "https://kymxllrauprmlyqdskic.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-secret";

  const { getSupabaseConfig } = await import("../src/lib/db/supabase.ts");
  const config = getSupabaseConfig();
  assert.equal(config?.projectRef, "kymxllrauprmlyqdskic");
});
