import test from "node:test";
import assert from "node:assert/strict";

const ENV_VARS = [
  "NVIDIA_API_KEY",
  "OPENAI_API_KEY",
  "GITHUB_TOKEN",
  "GITHUB_APP_PRIVATE_KEY",
  "BOOTRISE_SELF_REPO_REMOTE_URL"
];

function snapshotEnv() {
  const prior = {};
  for (const key of ENV_VARS) prior[key] = process.env[key];
  return prior;
}

function restoreEnv(prior) {
  for (const key of ENV_VARS) {
    if (prior[key] === undefined) delete process.env[key];
    else process.env[key] = prior[key];
  }
}

test("provider-keys masks values, never returns raw key, and emits placeholder snippet", async () => {
  const prior = snapshotEnv();
  for (const key of ENV_VARS) delete process.env[key];

  try {
    const { getProviderKeysStatus, getEnvSetupSnippet } = await import(
      "../src/lib/admin/provider-keys.ts"
    );

    let statuses = getProviderKeysStatus();
    assert.equal(statuses.length, ENV_VARS.length);
    assert.ok(statuses.every((s) => s.present === false));
    assert.ok(statuses.every((s) => s.masked === null));

    const snippetEmpty = getEnvSetupSnippet(statuses);
    assert.ok(snippetEmpty.includes("<paste-key-here>"));
    for (const envVar of ENV_VARS) {
      assert.ok(snippetEmpty.includes(envVar), `snippet should reference ${envVar}`);
    }

    const realLooking = "sk-ABCDEFGHIJKLMNOP1234abcd";
    process.env.OPENAI_API_KEY = realLooking;
    process.env.NVIDIA_API_KEY = "nvapi-ZZZZZZZZZZZZZZZZ9999wxyz";

    statuses = getProviderKeysStatus();
    const openai = statuses.find((s) => s.id === "openai");
    const nvidia = statuses.find((s) => s.id === "nvidia");
    assert.ok(openai && openai.present === true);
    assert.equal(openai.masked, "****abcd");
    assert.notEqual(openai.masked, realLooking);
    assert.ok(!JSON.stringify(statuses).includes(realLooking));
    assert.ok(nvidia && nvidia.masked && nvidia.masked.startsWith("****"));

    const missing = statuses.filter((s) => !s.present);
    const snippet = getEnvSetupSnippet(missing);
    assert.ok(!snippet.includes(realLooking));
    assert.ok(snippet.includes("<paste-key-here>"));
    assert.ok(!snippet.includes("OPENAI_API_KEY="), "snippet should skip present keys");
  } finally {
    restoreEnv(prior);
  }
});

test("provider-keys ready flag is false when neither nvidia nor openai is set", async () => {
  const prior = snapshotEnv();
  for (const key of ENV_VARS) delete process.env[key];

  try {
    const { getProviderKeysStatus } = await import("../src/lib/admin/provider-keys.ts");
    const statuses = getProviderKeysStatus();
    const ready = statuses.some((s) => (s.id === "nvidia" || s.id === "openai") && s.present);
    assert.equal(ready, false);
  } finally {
    restoreEnv(prior);
  }
});
