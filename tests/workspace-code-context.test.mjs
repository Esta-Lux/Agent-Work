import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyRepoPath,
  isTestPath,
  selectRelevantFiles,
  selectReviewBatches
} from "../src/lib/workspace/file-ranking.ts";

const FIXTURE = [
  { path: "app/backend/tests/test_map_search_navigation.py", content: "def test_map(): pass" },
  { path: "app/backend/tests/test_comprehensive_api.py", content: "def test_all(): pass" },
  { path: "app/backend/routes/navigation.py", content: "router = APIRouter()" },
  { path: "app/backend/routes/directions.py", content: "router = APIRouter()" },
  { path: "app/backend/services/navigation_ports.py", content: "class NavPorts: pass" },
  { path: "app/mobile/src/screens/MapScreen.tsx", content: "export function MapScreen() { return null; }" },
  { path: "app/mobile/src/components/navigation/TurnCard.tsx", content: "export function TurnCard() { return null; }" },
  { path: "app/mobile/src/navigation/navEngine.ts", content: "export function runNav() {}" },
  { path: "app/frontend/src/pages/DriverApp/index.tsx", content: "export default function DriverApp() {}" },
  { path: "AGENTS.md", content: "# Agents" },
  { path: "README.md", content: "# SnapRoad" }
];

test("isTestPath identifies backend and unit tests", () => {
  assert.equal(isTestPath("app/backend/tests/test_foo.py"), true);
  assert.equal(isTestPath("app/mobile/src/navigation/navGeometry.unit.test.ts"), true);
  assert.equal(isTestPath("app/mobile/src/screens/MapScreen.tsx"), false);
});

test("classifyRepoPath buckets monorepo areas", () => {
  assert.equal(classifyRepoPath("app/mobile/src/screens/MapScreen.tsx"), "mobile");
  assert.equal(classifyRepoPath("app/backend/routes/auth.py"), "backend");
  assert.equal(classifyRepoPath("app/backend/tests/test_auth.py"), "tests");
});

test("selectRelevantFiles deprioritizes tests for broad codebase review", () => {
  const message =
    "Review this codebase and list all issues, risks, and gaps. Cover backend, mobile, frontend, tests, and docs.";
  const picked = selectRelevantFiles(message, FIXTURE, 48);
  const paths = picked.map((f) => f.path);
  const testCount = paths.filter((p) => isTestPath(p)).length;
  const sourceCount = paths.filter((p) => !isTestPath(p)).length;

  assert.ok(paths.includes("app/mobile/src/screens/MapScreen.tsx"), "should include MapScreen");
  assert.ok(paths.includes("app/backend/routes/navigation.py"), "should include backend routes");
  assert.ok(testCount <= 5, `expected at most 5 test files, got ${testCount}`);
  assert.ok(sourceCount >= 6, `expected mostly source files, got ${sourceCount}`);
});

test("selectRelevantFiles prioritizes mobile HUD files for navigation questions", () => {
  const message = "Can you review the app while navigating and what is wrong with the HUD overall?";
  const picked = selectRelevantFiles(message, FIXTURE, 12);
  const paths = picked.map((f) => f.path);

  assert.ok(paths.includes("app/mobile/src/screens/MapScreen.tsx"));
  assert.ok(paths.includes("app/mobile/src/components/navigation/TurnCard.tsx"));
  assert.equal(paths.filter((p) => isTestPath(p)).length, 0);
  assert.ok(paths.indexOf("app/mobile/src/screens/MapScreen.tsx") < paths.indexOf("app/backend/routes/navigation.py"));
});

test("selectRelevantFiles includes tests when explicitly requested", () => {
  const message = "Review our pytest coverage and test gaps in app/backend/tests";
  const picked = selectRelevantFiles(message, FIXTURE, 12);
  const paths = picked.map((f) => f.path);
  assert.ok(paths.some((p) => isTestPath(p)));
});

test("selectReviewBatches pages across areas for large corpora", () => {
  const files = [];
  for (let i = 0; i < 80; i++) {
    files.push({ path: `app/mobile/src/navigation/file${i}.ts`, content: `export const n${i} = ${i};` });
  }
  for (let i = 0; i < 40; i++) {
    files.push({ path: `app/backend/routes/route_${i}.py`, content: `def r${i}(): pass` });
  }
  files.push({ path: "app/mobile/src/screens/MapScreen.tsx", content: "export function MapScreen() {}" });

  const message = "Review this codebase and list all issues and risks across mobile and backend";
  const plan = selectReviewBatches(message, files, 20, 6);

  assert.ok(plan.batches.length >= 2);
  assert.ok(plan.deepReadCap > 20);
  const allPaths = plan.batches.flat().map((f) => f.path);
  assert.ok(allPaths.includes("app/mobile/src/screens/MapScreen.tsx"));
  assert.ok(allPaths.some((p) => p.includes("app/backend/routes")));
});

test("selectReviewBatches excludes tests for product review", () => {
  const files = [
    ...Array.from({ length: 30 }, (_, i) => ({
      path: `app/backend/tests/test_${i}.py`,
      content: "def test_x(): pass"
    })),
    { path: "app/mobile/src/screens/MapScreen.tsx", content: "export function MapScreen() {}" }
  ];
  const plan = selectReviewBatches("Review HUD navigation issues", files, 10, 4);
  const paths = plan.batches.flat().map((f) => f.path);
  assert.ok(!paths.some((p) => p.includes("/tests/")));
  assert.ok(paths.includes("app/mobile/src/screens/MapScreen.tsx"));
});
