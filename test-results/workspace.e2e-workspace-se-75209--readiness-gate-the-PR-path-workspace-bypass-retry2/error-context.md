# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace.e2e.spec.ts >> workspace security scan and deploy readiness gate the PR path
- Location: tests/e2e/workspace.e2e.spec.ts:50:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Open draft PR' })
    - locator resolved to <button disabled type="button" class="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/30 disabled:pointer-events-none disabled:opacity-50 h-9 px-4 text-sm border border-border-ws bg-transparent text-text-ws-2 hover:bg-white/5 w-full">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    119 × waiting for element to be visible, enabled and stable
        - element is not enabled
      - retrying click action
        - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]: BR
        - generic [ref=e7]: BootRise
        - paragraph [ref=e9]: "Project: Agent Work"
        - generic [ref=e10]: fast
      - generic [ref=e11]:
        - generic [ref=e12]: 128 credits
        - generic [ref=e13]: DEV
        - generic [ref=e14]:
          - generic [ref=e15]: Dev
          - generic [ref=e16]: dev@bootrise.local
          - button "Sign out" [ref=e17] [cursor=pointer]
    - generic [ref=e18]:
      - generic [ref=e19]:
        - generic [ref=e20]:
          - paragraph [ref=e21]: BootRise Command Center
          - heading "Agent Work" [level=1] [ref=e22]
          - paragraph [ref=e23]: Export bundle is the next safe step.
        - generic [ref=e24]:
          - button "Guide" [ref=e25] [cursor=pointer]:
            - generic [ref=e26]: Guide
          - button "Mode" [ref=e28] [cursor=pointer]:
            - generic [ref=e29]: Mode
          - button "Export bundle" [ref=e30] [cursor=pointer]:
            - generic [ref=e31]: Export bundle
      - generic [ref=e32]:
        - generic [ref=e33]:
          - paragraph [ref=e34]: Brain
          - paragraph [ref=e35]: Indexed
        - generic [ref=e36]:
          - paragraph [ref=e37]: Control
          - paragraph [ref=e38]: Idle
        - generic [ref=e39]:
          - paragraph [ref=e40]: Security
          - paragraph [ref=e41]: Clear
        - generic [ref=e42]:
          - paragraph [ref=e43]: Safe to PR
          - paragraph [ref=e44]: Not yet
        - generic [ref=e45]:
          - paragraph [ref=e46]: Safe to deploy
          - paragraph [ref=e47]: Ready
        - generic [ref=e48]:
          - paragraph [ref=e49]: Credits
          - paragraph [ref=e50]: "128"
          - paragraph [ref=e51]: remaining
    - generic [ref=e52]:
      - complementary [ref=e53]:
        - generic [ref=e54]: Workflow
        - list [ref=e55]:
          - listitem [ref=e56]:
            - button "OK Connect Repo + import" [ref=e57] [cursor=pointer]:
              - generic [ref=e58]: OK
              - generic [ref=e59]:
                - generic [ref=e60]: Connect
                - generic [ref=e61]: Repo + import
          - listitem [ref=e63]:
            - button "OK Brain Context + roadmap" [ref=e64] [cursor=pointer]:
              - generic [ref=e65]: OK
              - generic [ref=e66]:
                - generic [ref=e67]: Brain
                - generic [ref=e68]: Context + roadmap
          - listitem [ref=e70]:
            - button "OK Fix Work units + patch" [ref=e71] [cursor=pointer]:
              - generic [ref=e72]: OK
              - generic [ref=e73]:
                - generic [ref=e74]: Fix
                - generic [ref=e75]: Work units + patch
          - listitem [ref=e77]:
            - button "OK Security Scan + verify" [ref=e78] [cursor=pointer]:
              - generic [ref=e79]: OK
              - generic [ref=e80]:
                - generic [ref=e81]: Security
                - generic [ref=e82]: Scan + verify
          - listitem [ref=e84]:
            - button "5 PR Preflight + draft PR" [active] [ref=e85] [cursor=pointer]:
              - generic [ref=e86]: "5"
              - generic [ref=e87]:
                - generic [ref=e88]: PR
                - generic [ref=e89]: Preflight + draft PR
        - generic [ref=e90]:
          - paragraph [ref=e91]: Operator focus
          - paragraph [ref=e92]: PR
          - paragraph [ref=e93]: Review PR safety evidence, then open a draft pull request.
      - main [ref=e94]:
        - generic [ref=e95]:
          - generic [ref=e96]:
            - generic [ref=e97]: Files
            - generic [ref=e99]:
              - button "- src" [ref=e100] [cursor=pointer]:
                - generic [ref=e101]: "-"
                - generic [ref=e102]: src
              - generic [ref=e103]:
                - button "- app" [ref=e104] [cursor=pointer]:
                  - generic [ref=e105]: "-"
                  - generic [ref=e106]: app
                - button "ts page.tsx" [ref=e108] [cursor=pointer]:
                  - generic [ref=e109]: ts
                  - generic [ref=e110]: page.tsx
              - generic [ref=e111]:
                - button "- components" [ref=e112] [cursor=pointer]:
                  - generic [ref=e113]: "-"
                  - generic [ref=e114]: components
                - button "ts status.tsx" [ref=e116] [cursor=pointer]:
                  - generic [ref=e117]: ts
                  - generic [ref=e118]: status.tsx
          - generic [ref=e120]:
            - generic [ref=e121]:
              - generic [ref=e122]:
                - paragraph [ref=e123]: src/app/page.tsx
                - paragraph [ref=e124]: Manual edits are included in safety checks.
              - generic [ref=e125]:
                - generic [ref=e126]: unchanged
                - generic [ref=e127]: normal risk
                - button "Reset" [disabled]:
                  - generic: Reset
            - textbox [ref=e128]: "export default function DemoPage() { return <main>BootRise demo workspace</main>; }"
        - generic [ref=e130]:
          - generic [ref=e131]:
            - paragraph [ref=e132]: Runtime monitor
            - button "Refresh" [ref=e133] [cursor=pointer]
          - generic [ref=e134]:
            - paragraph [ref=e135]: Deploy readiness ready for production.
            - paragraph [ref=e136]: ×12 · no file mapping
            - button "Suggest scoped fix →" [ref=e137] [cursor=pointer]
          - generic [ref=e138]:
            - paragraph [ref=e139]: Provider duel comparison completed.
            - paragraph [ref=e140]: ×6 · src/app/page.tsx, src/components/status.tsx
            - button "Suggest scoped fix →" [ref=e141] [cursor=pointer]
          - generic [ref=e142]:
            - paragraph [ref=e143]: "Security scan complete. Critical findings: 0."
            - paragraph [ref=e144]: ×26 · no file mapping
            - button "Suggest scoped fix →" [ref=e145] [cursor=pointer]
      - complementary [ref=e146]:
        - generic [ref=e147]:
          - paragraph [ref=e148]: Context inspector
          - generic [ref=e149]:
            - heading "export" [level=2] [ref=e150]
            - generic [ref=e151]: repo loaded
        - generic [ref=e153]:
          - generic [ref=e154]:
            - paragraph [ref=e155]: Agent council
            - generic [ref=e156]:
              - paragraph [ref=e157]: Agent status
              - paragraph [ref=e158]: "Active: Architect Agent"
            - generic [ref=e159]:
              - article [ref=e160]:
                - generic [ref=e161]:
                  - paragraph [ref=e162]: Architect Agent
                  - generic [ref=e163]: passed
                - paragraph [ref=e164]: Roadmap created and app type detected.
              - article [ref=e165]:
                - generic [ref=e166]:
                  - paragraph [ref=e167]: Project Brain Agent
                  - generic [ref=e168]: passed
                - paragraph [ref=e169]: Indexed 2 files with 0 routes.
              - article [ref=e170]:
                - generic [ref=e171]:
                  - paragraph [ref=e172]: Product Brain Agent
                  - generic [ref=e173]: passed
                - paragraph [ref=e174]: Tracking 4 workflow(s) and 1 policies.
              - article [ref=e175]:
                - generic [ref=e176]:
                  - paragraph [ref=e177]: Architect Conversation Agent
                  - generic [ref=e178]: idle
                - paragraph [ref=e179]: Describe the task in one scoped sentence before patching.
              - article [ref=e180]:
                - generic [ref=e181]:
                  - paragraph [ref=e182]: Scope Agent
                  - generic [ref=e183]: idle
                - paragraph [ref=e184]: Scope locks start after planning.
              - article [ref=e185]:
                - generic [ref=e186]:
                  - paragraph [ref=e187]: Builder Agent
                  - generic [ref=e188]: idle
                - paragraph [ref=e189]: Patch pending.
              - article [ref=e190]:
                - generic [ref=e191]:
                  - paragraph [ref=e192]: Security Agent
                  - generic [ref=e193]: passed
                - paragraph [ref=e194]: Security scan completed.
              - article [ref=e195]:
                - generic [ref=e196]:
                  - paragraph [ref=e197]: QA Agent
                  - generic [ref=e198]: idle
                - paragraph [ref=e199]: Verify is pending.
              - article [ref=e200]:
                - generic [ref=e201]:
                  - paragraph [ref=e202]: Deployment Agent
                  - generic [ref=e203]: passed
                - paragraph [ref=e204]: "Deployment readiness: ready for production."
          - generic [ref=e205]:
            - generic [ref=e206]:
              - paragraph [ref=e207]: Export bundle
              - paragraph [ref=e208]: Export is available after the brief and repo files are ready.
            - generic [ref=e209]:
              - generic [ref=e211]:
                - paragraph [ref=e212]: Safe to PR
                - paragraph [ref=e213]: Run Fix and Verify first.
              - generic [ref=e214]:
                - paragraph [ref=e215]: Security preflight
                - paragraph [ref=e216]: Security scan score is 96/100.
                - paragraph [ref=e217]: "Deployment readiness: ready for production."
              - generic [ref=e218]:
                - paragraph [ref=e219]: PR composer
                - generic [ref=e220]:
                  - generic [ref=e221]: Commit message
                  - textbox "Commit message" [ref=e222]: "BootRise: workspace patch"
                - generic [ref=e223]:
                  - generic [ref=e224]: PR title
                  - textbox "PR title" [ref=e225]: "BootRise: workspace patch"
                - button "Draft PR on" [ref=e226] [cursor=pointer]:
                  - generic [ref=e227]: Draft PR
                  - generic [ref=e228]: "on"
                - generic [ref=e229]:
                  - paragraph [ref=e230]: Preflight
                  - generic [ref=e231]:
                    - generic [ref=e232]:
                      - generic [ref=e233]: Patch approved
                      - generic [ref=e234]: blocker
                    - generic [ref=e235]:
                      - generic [ref=e236]: Files changed
                      - generic [ref=e237]: blocker
                    - generic [ref=e238]:
                      - generic [ref=e239]: Completion evaluator passed
                      - generic [ref=e240]: ok
                    - generic [ref=e241]:
                      - generic [ref=e242]: Vague Output Guard passed
                      - generic [ref=e243]: ok
                    - generic [ref=e244]:
                      - generic [ref=e245]: Reachability passed
                      - generic [ref=e246]: ok
                    - generic [ref=e247]:
                      - generic [ref=e248]: Security scan
                      - generic [ref=e249]: ok
                    - generic [ref=e250]:
                      - generic [ref=e251]: Deploy readiness
                      - generic [ref=e252]: blocker
                    - generic [ref=e253]:
                      - generic [ref=e254]: Verify run completed
                      - generic [ref=e255]: blocker
                - generic [ref=e256]:
                  - generic [ref=e257]: PR body preview
                  - textbox "PR body preview" [ref=e258]: "# BootRise Draft PR ## Task summary Workspace patch ## Changed files - No files reported ## Safety preflight - Patch approved: blocked - Files changed: blocked - Completion evaluator passed: passed - Vague Output Guard passed: passed - Reachability passed: passed - Security scan: passed - Deploy readiness: blocked - Verify run completed: blocked"
                - button "Open draft PR" [disabled]:
                  - generic: Open draft PR
                - paragraph [ref=e259]: Resolve preflight blockers before opening a draft PR.
          - generic [ref=e260]:
            - paragraph [ref=e261]: Project Brain v2
            - generic [ref=e262]:
              - generic [ref=e263]:
                - paragraph [ref=e264]: Files indexed
                - paragraph [ref=e265]: "2"
              - generic [ref=e266]:
                - paragraph [ref=e267]: Symbols
                - paragraph [ref=e268]: "1"
              - generic [ref=e269]:
                - paragraph [ref=e270]: API routes
                - paragraph [ref=e271]: "0"
              - generic [ref=e272]:
                - paragraph [ref=e273]: Unguarded routes
                - paragraph [ref=e274]: "0"
              - generic [ref=e275]:
                - paragraph [ref=e276]: Env vars
                - paragraph [ref=e277]: "0"
              - generic [ref=e278]:
                - paragraph [ref=e279]: Missing env docs
                - paragraph [ref=e280]: "0"
          - generic [ref=e281]:
            - paragraph [ref=e282]: Product Brain
            - paragraph [ref=e283]: BootRise command workspace
            - generic [ref=e284]:
              - paragraph [ref=e285]: Users
              - list [ref=e286]:
                - listitem [ref=e287]: "- Operators"
            - generic [ref=e288]:
              - paragraph [ref=e289]: Workflows
              - list [ref=e290]:
                - listitem [ref=e291]: "- import"
                - listitem [ref=e292]: "- fix"
                - listitem [ref=e293]: "- verify"
                - listitem [ref=e294]: "- draft_pr"
            - generic [ref=e295]:
              - paragraph [ref=e296]: Policies
              - list [ref=e297]:
                - listitem [ref=e298]: "- Approval required before PR"
            - generic [ref=e299]:
              - paragraph [ref=e300]: Roadmap
              - list [ref=e301]:
                - listitem [ref=e302]: "- Ship workspace E2E (in_progress)"
            - generic [ref=e303]:
              - paragraph [ref=e304]: Known risks
              - list [ref=e305]:
                - listitem [ref=e306]: "- Auth redirects need strict coverage"
            - generic [ref=e307]:
              - paragraph [ref=e308]: Definition of done
              - list [ref=e309]:
                - listitem [ref=e310]: "- Patch approved"
                - listitem [ref=e311]: "- Verify passed"
                - listitem [ref=e312]: "- Draft PR opened"
            - generic [ref=e313]:
              - 'textbox "Correct Product Brain: \"That policy is wrong\", \"Add this business rule\", ..." [ref=e314]'
              - button "Save correction" [disabled]:
                - generic: Save correction
          - generic [ref=e315]:
            - generic [ref=e316]:
              - paragraph [ref=e317]: Architecture roadmap
              - paragraph [ref=e318]: nextjs
              - paragraph [ref=e319]: Workspace and admin surfaces are wired for smoke coverage.
            - generic [ref=e320]:
              - paragraph [ref=e321]: Maturity
              - paragraph [ref=e322]: closed beta
            - generic [ref=e323]:
              - paragraph [ref=e324]: Production readiness
              - paragraph [ref=e325]: safe for staging
            - generic [ref=e326]:
              - paragraph [ref=e327]: Missing now
              - list [ref=e328]:
                - listitem [ref=e329]: • More edge-case coverage
            - generic [ref=e330]:
              - paragraph [ref=e331]: Security policies
              - list [ref=e332]:
                - listitem [ref=e333]: • Workspace auth gate
                - listitem [ref=e334]: • Admin authorization
            - generic [ref=e335]:
              - paragraph [ref=e336]: Suggested phases
              - list [ref=e337]:
                - listitem [ref=e338]: • Ship Playwright harness
            - generic [ref=e339]:
              - paragraph [ref=e340]: Acceptance criteria
              - list [ref=e341]:
                - listitem [ref=e342]: • Workspace flow covered
                - listitem [ref=e343]: • Admin routes covered
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
  32  |     for (let attempt = 0; attempt < 2; attempt += 1) {
  33  |       if (!(await approveAssumptions.isVisible().catch(() => false))) break;
  34  |       await approveAssumptions.click();
  35  |       await this.page.getByRole("button", { name: "Run Fix" }).click();
  36  |     }
  37  |     const useSinglePass = this.page.getByRole("button", { name: "Use single-pass fix" });
  38  |     if (options?.autoSinglePass !== false && await useSinglePass.isVisible().catch(() => false)) {
  39  |       await useSinglePass.click();
  40  |     }
  41  |     if (options?.expectApprove !== false) {
  42  |       await expect(this.page.getByRole("button", { name: "Approve patch" })).toBeVisible();
  43  |     }
  44  |   }
  45  | 
  46  |   async openGuide() {
  47  |     await this.page.getByRole("button", { name: "Guide" }).click();
  48  |     await expect(this.page.getByRole("dialog", { name: "BootRise guided tour" })).toBeVisible();
  49  |     await this.page.getByRole("button", { name: "Skip tour" }).click();
  50  |   }
  51  | 
  52  |   async compareProviders() {
  53  |     await this.page.getByRole("button", { name: "Compare providers" }).click();
  54  |     await expect(this.page.getByText("Provider duel", { exact: true })).toBeVisible();
  55  |   }
  56  | 
  57  |   async approvePatch() {
  58  |     await this.page.getByRole("button", { name: "Approve patch" }).click();
  59  |     await expect(this.page.getByRole("button", { name: "Run Verify" })).toBeVisible();
  60  |   }
  61  | 
  62  |   async runVerify() {
  63  |     await this.page.getByRole("button", { name: "Run Verify" }).click();
  64  |     await this.page.waitForTimeout(500);
  65  |   }
  66  | 
  67  |   async runSecurityScan() {
  68  |     await this.page.getByRole("button", { name: "Run security scan" }).click();
  69  |     await expect(this.page.getByText("Security scan complete", { exact: true })).toBeVisible();
  70  |   }
  71  | 
  72  |   async runDeployReadiness() {
  73  |     await this.page.getByRole("button", { name: "Run deploy readiness" }).click();
  74  |     await expect(this.page.getByText("Deploy readiness complete", { exact: true })).toBeVisible();
  75  |   }
  76  | 
  77  |   async exportBundle() {
  78  |     const exportButton = this.page.getByRole("button", { name: "Export bundle" }).first();
  79  |     if (await exportButton.isVisible().catch(() => false)) {
  80  |       await exportButton.click();
  81  |       await expect(this.page.getByText("Export bundle saved to /tmp/bootrise-export.zip")).toBeVisible();
  82  |     }
  83  |   }
  84  | 
  85  |   async openDraftPr() {
> 86  |     await this.page.getByRole("button", { name: "Open draft PR" }).click();
      |                                                                    ^ Error: locator.click: Test timeout of 60000ms exceeded.
  87  |     await expect(this.page.getByText("https://github.com/Esta-Lux/Agent-Work/pull/123")).toBeVisible();
  88  |   }
  89  | 
  90  |   async runMultiPass() {
  91  |     const approveAssumptions = this.page.getByRole("button", { name: "Approve assumptions" });
  92  |     if (await approveAssumptions.isVisible().catch(() => false)) {
  93  |       await approveAssumptions.click();
  94  |       await this.page.getByRole("button", { name: "Run Fix" }).click();
  95  |     }
  96  |     await this.page.getByRole("button", { name: "Run multi-pass" }).click();
  97  |     await expect(this.page.getByText("Work unit execution")).toBeVisible();
  98  |   }
  99  | 
  100 |   async rerunWorkUnit() {
  101 |     await this.page.getByRole("button", { name: "Re-run unit" }).first().click();
  102 |     await expect(this.page.getByText("Work unit rerun complete")).toBeVisible();
  103 |   }
  104 | 
  105 |   async saveProductBrainCorrection() {
  106 |     await this.page
  107 |       .getByPlaceholder('Correct Product Brain: "That policy is wrong", "Add this business rule", ...')
  108 |       .fill("Correction: add edge-case review.");
  109 |     await this.page.getByRole("button", { name: "Save correction" }).click();
  110 |   }
  111 | }
  112 | 
```