import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";

const { loadGithubAuthConfig, githubAuthStatus, hasGithubApiCredentials } = await import(
  "../src/lib/github/github-config.ts"
);

const envBackup = { ...process.env };

describe("github config", () => {
  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("reports not ready without credentials", () => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_APP_CLIENT_ID;
    delete process.env.GITHUB_APP_ID;
    const status = githubAuthStatus(loadGithubAuthConfig());
    assert.equal(status.ready, false);
    assert.equal(hasGithubApiCredentials(loadGithubAuthConfig()), false);
  });

  it("reports app client configured without exposing secret", () => {
    process.env.GITHUB_APP_CLIENT_ID = "Ov23test";
    process.env.GITHUB_APP_CLIENT_SECRET = "secret_value";
    const status = githubAuthStatus(loadGithubAuthConfig());
    assert.equal(status.app?.clientId, "Ov23test");
    assert.equal(status.app?.hasClientSecret, true);
    assert.equal(status.ready, false);
  });

  it("can issue installation tokens with client id and private key only", () => {
    process.env.GITHUB_APP_CLIENT_ID = "Iv23test";
    process.env.GITHUB_APP_PRIVATE_KEY = "-----BEGIN RSA PRIVATE KEY-----\\nkey\\n-----END RSA PRIVATE KEY-----";
    const status = githubAuthStatus(loadGithubAuthConfig());
    assert.equal(status.app?.jwtIssuer, "Iv23test");
    assert.equal(status.app?.hasClientSecret, false);
    assert.equal(status.app?.canIssueInstallationToken, true);
    assert.equal(status.ready, true);
  });

  it("ready with PAT", () => {
    process.env.GITHUB_TOKEN = "ghp_test";
    assert.equal(hasGithubApiCredentials(loadGithubAuthConfig()), true);
  });
});
