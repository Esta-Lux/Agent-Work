import { expect, test } from "playwright/test";
import { WorkspacePage } from "./page-objects/workspace-page";
import { mockWorkspaceApis } from "./support/mock-api";

test.beforeEach(async ({ page }) => {
  await mockWorkspaceApis(page);
});

test("workspace covers onboarding import fix approval verify and PR composer", async ({ page }) => {
  const workspace = new WorkspacePage(page);
  await workspace.goto();
  await workspace.expectLoaded();
  await workspace.openGuide();
  await workspace.connectRepo();
  await workspace.completeBrief();
  await workspace.saveProductBrainCorrection();
  await workspace.runFix("Add Playwright coverage for the workspace and admin surfaces.", { expectApprove: false });
  await workspace.compareProviders();
  await page.getByRole("button", { name: "Security" }).click();
  await expect(page.getByRole("button", { name: "Run security scan" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run deploy readiness" })).toBeVisible();
  await page.getByRole("button", { name: "PR" }).click();
  await expect(page.getByText("PR composer")).toBeVisible();
});

test("workspace roadmap guidance remains visible while planning", async ({ page }) => {
  const workspace = new WorkspacePage(page);
  await workspace.goto();
  await workspace.expectLoaded();
  await workspace.connectRepo();
  await workspace.completeBrief();
  await expect(page.getByText("Architecture roadmap")).toBeVisible();
  await expect(page.getByText("Approval gate remains required")).toBeVisible();
});

test("workspace full loop: multi-pass rerun approve verify open draft PR", async ({ page }) => {
  const workspace = new WorkspacePage(page);
  await workspace.goto();
  await workspace.expectLoaded();
  await workspace.connectRepo();
  await workspace.completeBrief();
  await workspace.runFix("Refactor workspace shell to use scoped work units.", { expectApprove: false });
  await workspace.runMultiPass();
  await workspace.rerunWorkUnit();
  await workspace.approvePatch();
  await workspace.runVerify();
  await workspace.openDraftPr();
});

test("workspace security scan and deploy readiness gate the PR path", async ({ page }) => {
  const workspace = new WorkspacePage(page);
  await workspace.goto();
  await workspace.expectLoaded();
  await workspace.connectRepo();
  await workspace.completeBrief();
  await page.getByRole("button", { name: "Security" }).click();
  await workspace.runSecurityScan();
  await workspace.runDeployReadiness();
  await page.getByRole("button", { name: "PR" }).click();
  await expect(page.getByText("PR composer")).toBeVisible();
  await workspace.openDraftPr();
});

test("architect blocks a high-risk task and approves assumptions before patching", async ({ page }) => {
  // Route the fix endpoint to return an architect-blocked state first
  await page.route("**/api/workspace/fix", (route: import("playwright/test").Route) => {
    const body = route.request().postDataJSON() as { assumptionsApproved?: boolean } | null;
    if (!body?.assumptionsApproved) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          report: null,
          architectDecision: {
            classification: "high_risk",
            message:
              "This request touches authentication boundaries. Clarify scope before proceeding.",
            requiresApproval: true,
            questions: [
              "Which auth routes are in scope?",
              "Should session invalidation be included?"
            ]
          }
        })
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        report: {
          repositoryId: "repo_playwright",
          plan: { summary: "Scoped auth change after architect approval." },
          diff: { summary: "Applied minimal auth patch." },
          blastRadius: ["src/lib/auth/with-auth.ts"],
          fixed: [{ path: "src/lib/auth/with-auth.ts", summary: "Hardened guard." }],
          potentiallyBroken: [],
          howFixed: ["Patch applied within approved scope."],
          verificationSummary: { verdict: "pending", summary: "Awaiting approval." },
          residualRisk: [],
          guidanceForBuilder: ["Approve and run verify."],
          safeToPr: { status: "caution", label: "Approve before PR.", checklist: [] },
          pendingFixId: "fix_arch",
          patches: [
            {
              path: "src/lib/auth/with-auth.ts",
              before: "// before",
              after: "// after",
              summary: "Hardened guard."
            }
          ],
          approvalStatus: "pending_approval",
          controlLayer: { canApprove: true, status: "review_required", blockers: [] }
        }
      })
    });
  });

  const workspace = new WorkspacePage(page);
  await workspace.goto();
  await workspace.expectLoaded();
  await workspace.connectRepo();
  await workspace.completeBrief();
  // First fix attempt should surface the architect block and ask for approval
  await page.getByLabel("Fix request").fill("Refactor authentication middleware across all routes.");
  await page.getByRole("button", { name: "Run Fix" }).click();
  // Architect should surface questions / block button
  const approveBtn = page.getByRole("button", { name: "Approve assumptions" });
  await expect(approveBtn).toBeVisible();
  // After approving, the fix should proceed
  await approveBtn.click();
  await page.getByRole("button", { name: "Run Fix" }).click();
  await expect(page.getByRole("button", { name: "Approve patch" })).toBeVisible();
});
