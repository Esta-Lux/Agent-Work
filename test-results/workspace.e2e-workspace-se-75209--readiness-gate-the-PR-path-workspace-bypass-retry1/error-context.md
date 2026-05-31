# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace.e2e.spec.ts >> workspace security scan and deploy readiness gate the PR path
- Location: tests/e2e/workspace.e2e.spec.ts:52:5

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
  - paragraph: Deploy readiness ready for production.
  - paragraph: ×15 · no file mapping
  - button "Suggest scoped fix →"
  - paragraph: Provider duel comparison completed.
  - paragraph: ×11 · src/app/page.tsx, src/components/status.tsx
  - button "Suggest scoped fix →"
  - paragraph: "Security scan complete. Critical findings: 0."
  - paragraph: ×29 · no file mapping
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
    - text: Update workspace status messaging in the imported demo files.
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
  1   | import { expect, type Page } from "playwright/test";
  2   | 
  3   | export class WorkspacePage {
  4   |   constructor(private readonly page: Page) {}
  5   | 
  6   |   async goto() {
  7   |     await this.page.goto("/");
  8   |   }
  9   | 
  10  |   async expectLoaded() {
  11  |     await expect(this.page.getByText("BootRise Command Center")).toBeVisible();
  12  |     await expect(this.page.getByRole("button", { name: "Connect repo", exact: true })).toBeVisible();
  13  |   }
  14  | 
  15  |   async connectRepo() {
  16  |     await this.page.getByLabel("GitHub URL").fill("https://github.com/Esta-Lux/Agent-Work");
  17  |     await this.page.getByRole("button", { name: "Connect repo", exact: true }).click();
  18  |     await expect(this.page.getByRole("button", { name: "Complete brief" })).toBeVisible();
  19  |     await expect(this.page.getByText("src/app/page.tsx", { exact: true })).toBeVisible();
  20  |   }
  21  | 
  22  |   async completeBrief() {
  23  |     await expect(this.page.getByLabel("Product name")).toHaveValue("Agent Work");
  24  |     await this.page.getByRole("button", { name: "Complete brief" }).click();
  25  |     await expect(this.page.getByLabel("Fix request")).toBeVisible();
  26  |   }
  27  | 
  28  |   async runFix(request: string, options?: { expectApprove?: boolean; autoSinglePass?: boolean }) {
  29  |     await this.page.getByLabel("Fix request").fill(request);
  30  |     await this.page.getByRole("button", { name: "Run Fix" }).click();
  31  |     const approveAssumptions = this.page.getByRole("button", { name: "Approve assumptions" });
  32  |     const approvePatch = this.page.getByRole("button", { name: "Approve patch" });
  33  |     const runMultiPass = this.page.getByRole("button", { name: "Run multi-pass" });
  34  |     const useSinglePass = this.page.getByRole("button", { name: "Use single-pass fix" });
  35  |     for (let attempt = 0; attempt < 2; attempt += 1) {
  36  |       await Promise.race([
  37  |         approveAssumptions.waitFor({ state: "visible", timeout: 4000 }),
  38  |         approvePatch.waitFor({ state: "visible", timeout: 4000 }),
  39  |         runMultiPass.waitFor({ state: "visible", timeout: 4000 }),
  40  |         useSinglePass.waitFor({ state: "visible", timeout: 4000 })
  41  |       ]).catch(() => undefined);
  42  |       if (!(await approveAssumptions.isVisible().catch(() => false))) break;
  43  |       await approveAssumptions.click();
  44  |       await this.page.getByRole("button", { name: "Run Fix" }).click();
  45  |     }
  46  |     if (options?.autoSinglePass !== false && await useSinglePass.isVisible().catch(() => false)) {
  47  |       await useSinglePass.click();
  48  |     }
  49  |     if (options?.expectApprove !== false) {
> 50  |       await expect(approvePatch).toBeVisible();
      |                                  ^ Error: expect(locator).toBeVisible() failed
  51  |     }
  52  |   }
  53  | 
  54  |   async openGuide() {
  55  |     await this.page.getByRole("button", { name: "Guide" }).click();
  56  |     await expect(this.page.getByRole("dialog", { name: "BootRise guided tour" })).toBeVisible();
  57  |     await this.page.getByRole("button", { name: "Skip tour" }).click();
  58  |   }
  59  | 
  60  |   async compareProviders() {
  61  |     await this.page.getByRole("button", { name: "Compare providers" }).click();
  62  |     await expect(this.page.getByText("Provider duel", { exact: true })).toBeVisible();
  63  |   }
  64  | 
  65  |   async approvePatch() {
  66  |     const approvePatch = this.page.getByRole("button", { name: "Approve patch" });
  67  |     if (!(await approvePatch.isVisible().catch(() => false))) {
  68  |       const approveAssumptions = this.page.getByRole("button", { name: "Approve assumptions" });
  69  |       if (await approveAssumptions.isVisible().catch(() => false)) {
  70  |         await approveAssumptions.click();
  71  |         await this.page.getByRole("button", { name: "Run Fix" }).click();
  72  |       }
  73  |     }
  74  |     await expect(approvePatch).toBeVisible();
  75  |     await approvePatch.click();
  76  |     await expect(this.page.getByRole("button", { name: "Run Verify" })).toBeVisible();
  77  |   }
  78  | 
  79  |   async runVerify() {
  80  |     await this.page.getByRole("button", { name: "Run Verify" }).click();
  81  |     await this.page.waitForTimeout(500);
  82  |   }
  83  | 
  84  |   async runSecurityScan() {
  85  |     await this.page.getByRole("button", { name: "Run security scan" }).click();
  86  |     await expect(this.page.getByText("Security scan complete", { exact: true })).toBeVisible();
  87  |   }
  88  | 
  89  |   async runDeployReadiness() {
  90  |     await this.page.getByRole("button", { name: "Run deploy readiness" }).click();
  91  |     await expect(this.page.getByText("Deploy readiness complete", { exact: true })).toBeVisible();
  92  |   }
  93  | 
  94  |   async exportBundle() {
  95  |     const exportButton = this.page.getByRole("button", { name: "Export bundle" }).first();
  96  |     if (await exportButton.isVisible().catch(() => false)) {
  97  |       await exportButton.click();
  98  |       await expect(this.page.getByText("Export bundle saved to /tmp/bootrise-export.zip")).toBeVisible();
  99  |     }
  100 |   }
  101 | 
  102 |   async openDraftPr() {
  103 |     const openDraftPrButton = this.page.getByRole("button", { name: "Open draft PR" });
  104 |     await expect(openDraftPrButton).toBeEnabled();
  105 |     await openDraftPrButton.click();
  106 |     await expect(this.page.getByText("https://github.com/Esta-Lux/Agent-Work/pull/123")).toBeVisible();
  107 |   }
  108 | 
  109 |   async runMultiPass(): Promise<boolean> {
  110 |     const approveAssumptions = this.page.getByRole("button", { name: "Approve assumptions" });
  111 |     if (await approveAssumptions.isVisible().catch(() => false)) {
  112 |       await approveAssumptions.click();
  113 |       await this.page.getByRole("button", { name: "Run Fix" }).click();
  114 |     }
  115 |     const runMultiPassButton = this.page.getByRole("button", { name: "Run multi-pass" });
  116 |     if (!(await runMultiPassButton.isVisible().catch(() => false))) {
  117 |       const useSinglePass = this.page.getByRole("button", { name: "Use single-pass fix" });
  118 |       if (await useSinglePass.isVisible().catch(() => false)) {
  119 |         await useSinglePass.click();
  120 |       }
  121 |       return false;
  122 |     }
  123 |     await runMultiPassButton.click();
  124 |     await expect(this.page.getByText("Work unit execution")).toBeVisible();
  125 |     return true;
  126 |   }
  127 | 
  128 |   async rerunWorkUnit() {
  129 |     await this.page.getByRole("button", { name: "Re-run unit" }).first().click();
  130 |     await expect(this.page.getByText("Work unit rerun complete")).toBeVisible();
  131 |   }
  132 | 
  133 |   async saveProductBrainCorrection() {
  134 |     await this.page
  135 |       .getByPlaceholder('Correct Product Brain: "That policy is wrong", "Add this business rule", ...')
  136 |       .fill("Correction: add edge-case review.");
  137 |     await this.page.getByRole("button", { name: "Save correction" }).click();
  138 |   }
  139 | }
  140 | 
```