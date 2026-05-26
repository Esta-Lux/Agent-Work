import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTaskKey,
  recordPatchAttempt,
  getFailedAttemptCount,
  clearTaskSession
} from "../src/lib/control/task-session.ts";

test("task session tracks failed attempts per repository and request", () => {
  const repo = "repo_test_session";
  const request = "fix rewards history unique";
  const key = buildTaskKey(repo, request);
  clearTaskSession(key);

  recordPatchAttempt({ repositoryId: repo, request, blocked: true });
  recordPatchAttempt({ repositoryId: repo, request, blocked: true });
  assert.equal(getFailedAttemptCount(repo, request), 2);

  clearTaskSession(key);
  assert.equal(getFailedAttemptCount(repo, request), 0);
});
