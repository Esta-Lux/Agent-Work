# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace.e2e.spec.ts >> architect blocks a high-risk task and approves assumptions before patching
- Location: tests/e2e/workspace.e2e.spec.ts:64:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Approve patch' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('button', { name: 'Approve patch' })

```

```yaml
- alert
- banner:
  - text: BR BootRise
  - paragraph: "Project: Agent Work"
  - text: fast 128 credits DEV Dev dev@bootrise.local
  - button "Sign out"
- paragraph: BootRise Command Center
- heading "Agent Work" [level=1]
- paragraph: Run Fix is the next safe step.
- button "Guide"
- button "Mode"
- button "Run Fix"
- paragraph: Brain
- paragraph: Indexed
- paragraph: Control
- paragraph: Idle
- paragraph: Security
- paragraph: Clear
- paragraph: Safe to PR
- paragraph: Not yet
- paragraph: Safe to deploy
- paragraph: Ready
- paragraph: Credits
- paragraph: "128"
- paragraph: remaining
- complementary:
  - text: Workflow
  - list:
    - listitem:
      - button "OK Connect Repo + import"
    - listitem:
      - button "OK Brain Context + roadmap"
    - listitem:
      - button "3 Fix Work units + patch"
    - listitem:
      - button "4 Security Scan + verify"
    - listitem:
      - button "5 PR Preflight + draft PR"
  - paragraph: Operator focus
  - paragraph: Fix
  - paragraph: Split complex tasks into work units and execute controlled patches.
- main:
  - text: Files
  - button "- src"
  - button "- app"
  - button "ts page.tsx"
  - button "- components"
  - button "ts status.tsx"
  - paragraph: src/app/page.tsx
  - paragraph: Manual edits are included in safety checks.
  - text: unchanged normal risk
  - button "Reset" [disabled]
  - textbox: "export default function DemoPage() { return <main>BootRise demo workspace</main>; }"
  - paragraph: Runtime monitor
  - button "Refresh"
  - paragraph: "Security scan complete. Critical findings: 0."
  - paragraph: ×3 · no file mapping
  - button "Suggest scoped fix →"
- complementary:
  - paragraph: Context inspector
  - heading "fix" [level=2]
  - text: repo loaded !
  - paragraph: Needs attention
  - paragraph: Should access and billing changes apply globally, per workspace, or per project owner?
  - paragraph: Agent council
  - paragraph: Agent status
  - paragraph: "Active: Architect Conversation Agent"
  - article:
    - paragraph: Architect Agent
    - text: passed
    - paragraph: Roadmap created and app type detected.
  - article:
    - paragraph: Project Brain Agent
    - text: passed
    - paragraph: Indexed 2 files with 0 routes.
  - article:
    - paragraph: Product Brain Agent
    - text: passed
    - paragraph: Tracking 4 workflow(s) and 1 policies.
  - article:
    - paragraph: Architect Conversation Agent
    - text: running
    - paragraph: This task touches high-risk boundaries, so assumptions must be confirmed before patching.
  - article:
    - paragraph: Scope Agent
    - text: running
    - paragraph: Scope locks start after planning.
  - article:
    - paragraph: Builder Agent
    - text: idle
    - paragraph: Patch pending.
  - article:
    - paragraph: Security Agent
    - text: idle
    - paragraph: Security scan not run.
  - article:
    - paragraph: QA Agent
    - text: idle
    - paragraph: Verify is pending.
  - article:
    - paragraph: Deployment Agent
    - text: passed
    - paragraph: Deploy readiness not run.
  - text: Fix request
  - textbox "Fix request":
    - /placeholder: Describe one scoped change...
    - text: Refactor authentication middleware across all routes.
  - paragraph: Plan summary
  - text: fast
  - paragraph: "Provider: BootRise. Approval gate remains required before workspace changes are applied."
  - button "Compare providers"
  - paragraph: Architect conversation
  - text: high risk
  - paragraph: This task touches high-risk boundaries, so assumptions must be confirmed before patching.
  - paragraph: "Question: Should access and billing changes apply globally, per workspace, or per project owner?"
  - paragraph: "Recommended: Prefer least-privilege scope and keep tenant boundaries explicit."
  - button "Approve assumptions"
  - paragraph: Project Brain v2
  - paragraph: Files indexed
  - paragraph: "2"
  - paragraph: Symbols
  - paragraph: "1"
  - paragraph: API routes
  - paragraph: "0"
  - paragraph: Unguarded routes
  - paragraph: "0"
  - paragraph: Env vars
  - paragraph: "0"
  - paragraph: Missing env docs
  - paragraph: "0"
  - paragraph: Product Brain
  - paragraph: BootRise command workspace
  - paragraph: Users
  - list:
    - listitem: "- Operators"
  - paragraph: Workflows
  - list:
    - listitem: "- import"
    - listitem: "- fix"
    - listitem: "- verify"
    - listitem: "- draft_pr"
  - paragraph: Policies
  - list:
    - listitem: "- Approval required before PR"
  - paragraph: Roadmap
  - list:
    - listitem: "- Ship workspace E2E (in_progress)"
  - paragraph: Known risks
  - list:
    - listitem: "- Auth redirects need strict coverage"
  - paragraph: Definition of done
  - list:
    - listitem: "- Patch approved"
    - listitem: "- Verify passed"
    - listitem: "- Draft PR opened"
  - 'textbox "Correct Product Brain: \"That policy is wrong\", \"Add this business rule\", ..."'
  - button "Save correction" [disabled]
  - paragraph: Architecture roadmap
  - paragraph: nextjs
  - paragraph: Workspace and admin surfaces are wired for smoke coverage.
  - paragraph: Maturity
  - paragraph: closed beta
  - paragraph: Production readiness
  - paragraph: safe for staging
  - paragraph: Missing now
  - list:
    - listitem: • More edge-case coverage
  - paragraph: Security policies
  - list:
    - listitem: • Workspace auth gate
    - listitem: • Admin authorization
  - paragraph: Suggested phases
  - list:
    - listitem: • Ship Playwright harness
  - paragraph: Acceptance criteria
  - list:
    - listitem: • Workspace flow covered
    - listitem: • Admin routes covered
```

# Test source

```ts
  33  |   await expect(page.getByText("Approval gate remains required")).toBeVisible();
  34  | });
  35  | 
  36  | test("workspace full loop: multi-pass rerun approve verify open draft PR", async ({ page }) => {
  37  |   const workspace = new WorkspacePage(page);
  38  |   await workspace.goto();
  39  |   await workspace.expectLoaded();
  40  |   await workspace.connectRepo();
  41  |   await workspace.completeBrief();
  42  |   await workspace.runFix("Refactor workspace shell to use scoped work units.", { expectApprove: false });
  43  |   await workspace.runMultiPass();
  44  |   await workspace.rerunWorkUnit();
  45  |   await workspace.approvePatch();
  46  |   await workspace.runVerify();
  47  |   await workspace.openDraftPr();
  48  | });
  49  | 
  50  | test("workspace security scan and deploy readiness gate the PR path", async ({ page }) => {
  51  |   const workspace = new WorkspacePage(page);
  52  |   await workspace.goto();
  53  |   await workspace.expectLoaded();
  54  |   await workspace.connectRepo();
  55  |   await workspace.completeBrief();
  56  |   await page.getByRole("button", { name: "Security" }).click();
  57  |   await workspace.runSecurityScan();
  58  |   await workspace.runDeployReadiness();
  59  |   await page.getByRole("button", { name: "PR" }).click();
  60  |   await expect(page.getByText("PR composer")).toBeVisible();
  61  |   await workspace.openDraftPr();
  62  | });
  63  | 
  64  | test("architect blocks a high-risk task and approves assumptions before patching", async ({ page }) => {
  65  |   // Route the fix endpoint to return an architect-blocked state first
  66  |   await page.route("**/api/workspace/fix", (route: Route) => {
  67  |     const body = route.request().postDataJSON() as { assumptionsApproved?: boolean } | null;
  68  |     if (!body?.assumptionsApproved) {
  69  |       return route.fulfill({
  70  |         status: 200,
  71  |         contentType: "application/json",
  72  |         body: JSON.stringify({
  73  |           report: null,
  74  |           architectDecision: {
  75  |             classification: "high_risk",
  76  |             message:
  77  |               "This request touches authentication boundaries. Clarify scope before proceeding.",
  78  |             requiresApproval: true,
  79  |             questions: [
  80  |               "Which auth routes are in scope?",
  81  |               "Should session invalidation be included?"
  82  |             ]
  83  |           }
  84  |         })
  85  |       });
  86  |     }
  87  |     return route.fulfill({
  88  |       status: 200,
  89  |       contentType: "application/json",
  90  |       body: JSON.stringify({
  91  |         report: {
  92  |           repositoryId: "repo_playwright",
  93  |           plan: { summary: "Scoped auth change after architect approval." },
  94  |           diff: { summary: "Applied minimal auth patch." },
  95  |           blastRadius: ["src/lib/auth/with-auth.ts"],
  96  |           fixed: [{ path: "src/lib/auth/with-auth.ts", summary: "Hardened guard." }],
  97  |           potentiallyBroken: [],
  98  |           howFixed: ["Patch applied within approved scope."],
  99  |           verificationSummary: { verdict: "pending", summary: "Awaiting approval." },
  100 |           residualRisk: [],
  101 |           guidanceForBuilder: ["Approve and run verify."],
  102 |           safeToPr: { status: "caution", label: "Approve before PR.", checklist: [] },
  103 |           pendingFixId: "fix_arch",
  104 |           patches: [
  105 |             {
  106 |               path: "src/lib/auth/with-auth.ts",
  107 |               before: "// before",
  108 |               after: "// after",
  109 |               summary: "Hardened guard."
  110 |             }
  111 |           ],
  112 |           approvalStatus: "pending_approval",
  113 |           controlLayer: { canApprove: true, status: "review_required", blockers: [] }
  114 |         }
  115 |       })
  116 |     });
  117 |   });
  118 | 
  119 |   const workspace = new WorkspacePage(page);
  120 |   await workspace.goto();
  121 |   await workspace.expectLoaded();
  122 |   await workspace.connectRepo();
  123 |   await workspace.completeBrief();
  124 |   // First fix attempt should surface the architect block and ask for approval
  125 |   await page.getByLabel("Fix request").fill("Refactor authentication middleware across all routes.");
  126 |   await page.getByRole("button", { name: "Run Fix" }).click();
  127 |   // Architect should surface questions / block button
  128 |   const approveBtn = page.getByRole("button", { name: "Approve assumptions" });
  129 |   await expect(approveBtn).toBeVisible();
  130 |   // After approving, the fix should proceed
  131 |   await approveBtn.click();
  132 |   await page.getByRole("button", { name: "Run Fix" }).click();
> 133 |   await expect(page.getByRole("button", { name: "Approve patch" })).toBeVisible();
      |                                                                     ^ Error: expect(locator).toBeVisible() failed
  134 | });
  135 | 
```