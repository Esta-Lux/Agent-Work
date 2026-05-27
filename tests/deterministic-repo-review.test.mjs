import test from "node:test";
import assert from "node:assert/strict";
import { buildDeterministicRepoReview } from "../src/lib/workspace/deterministic-repo-review.ts";

const FILES = [
  { path: "README.md", content: "# SnapRoad" },
  { path: "AGENTS.md", content: "# Agent rules" },
  { path: "app/backend/routes/auth.py", content: "router = APIRouter()" },
  { path: "app/backend/routes/offers.py", content: "router = APIRouter()" },
  { path: "app/backend/tests/test_auth.py", content: "def test_auth(): pass" },
  { path: "app/backend/sql/020_prelaunch_security_hardening.sql", content: "alter table profiles enable row level security;" },
  { path: "app/frontend/src/pages/DriverApp/components/OffersModal.tsx", content: "export function OffersModal() { return null; }" },
  { path: "app/mobile/src/screens/MapScreen.tsx", content: "export function MapScreen() { return null; }" },
  { path: "app/mobile/src/components/navigation/TurnCard.tsx", content: "export function TurnCard() { return null; }" },
  { path: "app/mobile/src/navigation/navEngine.ts", content: "export function navEngine() {}" },
  { path: "app/docs/LAUNCH_READINESS_RUNBOOK.md", content: "# Launch" },
  { path: ".github/workflows/validate.yml", content: "name: validate" },
  { path: "package.json", content: "{\"scripts\":{\"build\":\"next build\"}}" },
  { path: "app/mobile/package.json", content: "{\"scripts\":{\"test\":\"jest\"}}" }
];

test("deterministic repo review gives fast evidence from imported files", () => {
  const result = buildDeterministicRepoReview({
    message: "Review this codebase and list all issues, risks, and gaps across backend, mobile, frontend, tests, and docs.",
    files: FILES,
    projectName: "SnapRoad"
  });

  assert.match(result.reply, /BootRise indexed 14 files/);
  assert.match(result.reply, /ISSUES, RISKS, AND GAPS/);
  assert.match(result.reply, /app\/backend\/routes\/auth\.py/);
  assert.match(result.reply, /app\/mobile\/src\/components\/navigation\/TurnCard\.tsx/);
  assert.match(result.reply, /Project Brain/);
  assert.ok(result.deepReadFiles.length > 0);
  assert.ok(result.findings.some((finding) => finding.area === "security"));
});
