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
    120 × waiting for element to be visible, enabled and stable
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
          - generic [ref=e15]: workspace-e2e@bootrise.local
          - button "Sign out" [ref=e16] [cursor=pointer]
    - generic [ref=e17]:
      - generic [ref=e18]:
        - generic [ref=e19]:
          - paragraph [ref=e20]: BootRise Command Center
          - heading "Agent Work" [level=1] [ref=e21]
          - paragraph [ref=e22]: Export bundle is the next safe step.
        - generic [ref=e23]:
          - button "Guide" [ref=e24] [cursor=pointer]:
            - generic [ref=e25]: Guide
          - button "Mode" [ref=e27] [cursor=pointer]:
            - generic [ref=e28]: Mode
          - button "Export bundle" [ref=e29] [cursor=pointer]:
            - generic [ref=e30]: Export bundle
      - generic [ref=e31]:
        - generic [ref=e32]:
          - paragraph [ref=e33]: Brain
          - paragraph [ref=e34]: Indexed
        - generic [ref=e35]:
          - paragraph [ref=e36]: Control
          - paragraph [ref=e37]: Idle
        - generic [ref=e38]:
          - paragraph [ref=e39]: Security
          - paragraph [ref=e40]: Clear
        - generic [ref=e41]:
          - paragraph [ref=e42]: Safe to PR
          - paragraph [ref=e43]: Not yet
        - generic [ref=e44]:
          - paragraph [ref=e45]: Safe to deploy
          - paragraph [ref=e46]: Ready
        - generic [ref=e47]:
          - paragraph [ref=e48]: Credits
          - paragraph [ref=e49]: "128"
          - paragraph [ref=e50]: remaining
    - generic [ref=e51]:
      - complementary [ref=e52]:
        - generic [ref=e53]: Workflow
        - list [ref=e54]:
          - listitem [ref=e55]:
            - button "OK Connect Repo + import" [ref=e56] [cursor=pointer]:
              - generic [ref=e57]: OK
              - generic [ref=e58]:
                - generic [ref=e59]: Connect
                - generic [ref=e60]: Repo + import
          - listitem [ref=e62]:
            - button "OK Brain Context + roadmap" [ref=e63] [cursor=pointer]:
              - generic [ref=e64]: OK
              - generic [ref=e65]:
                - generic [ref=e66]: Brain
                - generic [ref=e67]: Context + roadmap
          - listitem [ref=e69]:
            - button "OK Fix Work units + patch" [ref=e70] [cursor=pointer]:
              - generic [ref=e71]: OK
              - generic [ref=e72]:
                - generic [ref=e73]: Fix
                - generic [ref=e74]: Work units + patch
          - listitem [ref=e76]:
            - button "OK Security Scan + verify" [ref=e77] [cursor=pointer]:
              - generic [ref=e78]: OK
              - generic [ref=e79]:
                - generic [ref=e80]: Security
                - generic [ref=e81]: Scan + verify
          - listitem [ref=e83]:
            - button "5 PR Preflight + draft PR" [active] [ref=e84] [cursor=pointer]:
              - generic [ref=e85]: "5"
              - generic [ref=e86]:
                - generic [ref=e87]: PR
                - generic [ref=e88]: Preflight + draft PR
        - generic [ref=e89]:
          - paragraph [ref=e90]: Operator focus
          - paragraph [ref=e91]: PR
          - paragraph [ref=e92]: Review PR safety evidence, then open a draft pull request.
      - main [ref=e93]:
        - generic [ref=e94]:
          - generic [ref=e95]:
            - generic [ref=e96]: Files
            - generic [ref=e98]:
              - button "- src" [ref=e99] [cursor=pointer]:
                - generic [ref=e100]: "-"
                - generic [ref=e101]: src
              - generic [ref=e102]:
                - button "- app" [ref=e103] [cursor=pointer]:
                  - generic [ref=e104]: "-"
                  - generic [ref=e105]: app
                - button "ts page.tsx" [ref=e107] [cursor=pointer]:
                  - generic [ref=e108]: ts
                  - generic [ref=e109]: page.tsx
              - generic [ref=e110]:
                - button "- components" [ref=e111] [cursor=pointer]:
                  - generic [ref=e112]: "-"
                  - generic [ref=e113]: components
                - button "ts status.tsx" [ref=e115] [cursor=pointer]:
                  - generic [ref=e116]: ts
                  - generic [ref=e117]: status.tsx
          - generic [ref=e119]:
            - generic [ref=e120]:
              - generic [ref=e121]:
                - paragraph [ref=e122]: src/app/page.tsx
                - paragraph [ref=e123]: Manual edits are included in safety checks.
              - generic [ref=e124]:
                - generic [ref=e125]: unchanged
                - generic [ref=e126]: normal risk
                - button "Reset" [disabled]:
                  - generic: Reset
            - textbox [ref=e127]: "export default function DemoPage() { return <main>BootRise demo workspace</main>; }"
        - generic [ref=e129]:
          - generic [ref=e130]:
            - paragraph [ref=e131]: Runtime monitor
            - button "Refresh" [ref=e132] [cursor=pointer]
          - generic [ref=e133]:
            - paragraph [ref=e134]: Deploy readiness ready for production.
            - paragraph [ref=e135]: ×15 · no file mapping
            - button "Suggest scoped fix →" [ref=e136] [cursor=pointer]
          - generic [ref=e137]:
            - paragraph [ref=e138]: Provider duel comparison completed.
            - paragraph [ref=e139]: ×7 · src/app/page.tsx, src/components/status.tsx
            - button "Suggest scoped fix →" [ref=e140] [cursor=pointer]
          - generic [ref=e141]:
            - paragraph [ref=e142]: "Security scan complete. Critical findings: 0."
            - paragraph [ref=e143]: ×29 · no file mapping
            - button "Suggest scoped fix →" [ref=e144] [cursor=pointer]
      - complementary [ref=e145]:
        - generic [ref=e146]:
          - paragraph [ref=e147]: Context inspector
          - generic [ref=e148]:
            - heading "export" [level=2] [ref=e149]
            - generic [ref=e150]: repo loaded
        - generic [ref=e152]:
          - generic [ref=e153]:
            - paragraph [ref=e154]: Agent council
            - generic [ref=e155]:
              - paragraph [ref=e156]: Agent status
              - paragraph [ref=e157]: "Active: Architect Agent"
            - generic [ref=e158]:
              - article [ref=e159]:
                - generic [ref=e160]:
                  - paragraph [ref=e161]: Architect Agent
                  - generic [ref=e162]: passed
                - paragraph [ref=e163]: Roadmap created and app type detected.
              - article [ref=e164]:
                - generic [ref=e165]:
                  - paragraph [ref=e166]: Project Brain Agent
                  - generic [ref=e167]: passed
                - paragraph [ref=e168]: Indexed 2 files with 0 routes.
              - article [ref=e169]:
                - generic [ref=e170]:
                  - paragraph [ref=e171]: Product Brain Agent
                  - generic [ref=e172]: passed
                - paragraph [ref=e173]: Tracking 4 workflow(s) and 1 policies.
              - article [ref=e174]:
                - generic [ref=e175]:
                  - paragraph [ref=e176]: Architect Conversation Agent
                  - generic [ref=e177]: idle
                - paragraph [ref=e178]: Describe the task in one scoped sentence before patching.
              - article [ref=e179]:
                - generic [ref=e180]:
                  - paragraph [ref=e181]: Scope Agent
                  - generic [ref=e182]: idle
                - paragraph [ref=e183]: Scope locks start after planning.
              - article [ref=e184]:
                - generic [ref=e185]:
                  - paragraph [ref=e186]: Builder Agent
                  - generic [ref=e187]: idle
                - paragraph [ref=e188]: Patch pending.
              - article [ref=e189]:
                - generic [ref=e190]:
                  - paragraph [ref=e191]: Security Agent
                  - generic [ref=e192]: passed
                - paragraph [ref=e193]: Security scan completed.
              - article [ref=e194]:
                - generic [ref=e195]:
                  - paragraph [ref=e196]: QA Agent
                  - generic [ref=e197]: idle
                - paragraph [ref=e198]: Verify is pending.
              - article [ref=e199]:
                - generic [ref=e200]:
                  - paragraph [ref=e201]: Deployment Agent
                  - generic [ref=e202]: passed
                - paragraph [ref=e203]: "Deployment readiness: ready for production."
          - generic [ref=e204]:
            - generic [ref=e205]:
              - paragraph [ref=e206]: Export bundle
              - paragraph [ref=e207]: Export is available after the brief and repo files are ready.
            - generic [ref=e208]:
              - generic [ref=e210]:
                - paragraph [ref=e211]: Safe to PR
                - paragraph [ref=e212]: Run Fix and Verify first.
              - generic [ref=e213]:
                - paragraph [ref=e214]: Security preflight
                - paragraph [ref=e215]: Security scan score is 96/100.
                - paragraph [ref=e216]: "Deployment readiness: ready for production."
              - generic [ref=e217]:
                - paragraph [ref=e218]: PR composer
                - generic [ref=e219]:
                  - generic [ref=e220]: Commit message
                  - textbox "Commit message" [ref=e221]: "BootRise: workspace patch"
                - generic [ref=e222]:
                  - generic [ref=e223]: PR title
                  - textbox "PR title" [ref=e224]: "BootRise: workspace patch"
                - button "Draft PR on" [ref=e225] [cursor=pointer]:
                  - generic [ref=e226]: Draft PR
                  - generic [ref=e227]: "on"
                - generic [ref=e228]:
                  - paragraph [ref=e229]: Preflight
                  - generic [ref=e230]:
                    - generic [ref=e231]:
                      - generic [ref=e232]: Patch approved
                      - generic [ref=e233]: blocker
                    - generic [ref=e234]:
                      - generic [ref=e235]: Files changed
                      - generic [ref=e236]: blocker
                    - generic [ref=e237]:
                      - generic [ref=e238]: Completion evaluator passed
                      - generic [ref=e239]: ok
                    - generic [ref=e240]:
                      - generic [ref=e241]: Vague Output Guard passed
                      - generic [ref=e242]: ok
                    - generic [ref=e243]:
                      - generic [ref=e244]: Reachability passed
                      - generic [ref=e245]: ok
                    - generic [ref=e246]:
                      - generic [ref=e247]: Security scan
                      - generic [ref=e248]: ok
                    - generic [ref=e249]:
                      - generic [ref=e250]: Deploy readiness
                      - generic [ref=e251]: blocker
                    - generic [ref=e252]:
                      - generic [ref=e253]: Verify run completed
                      - generic [ref=e254]: blocker
                - generic [ref=e255]:
                  - generic [ref=e256]: PR body preview
                  - textbox "PR body preview" [ref=e257]: "# BootRise Draft PR ## Task summary Workspace patch ## Changed files - No files reported ## Safety preflight - Patch approved: blocked - Files changed: blocked - Completion evaluator passed: passed - Vague Output Guard passed: passed - Reachability passed: passed - Security scan: passed - Deploy readiness: blocked - Verify run completed: blocked"
                - button "Open draft PR" [disabled]:
                  - generic: Open draft PR
                - paragraph [ref=e258]: Resolve preflight blockers before opening a draft PR.
          - generic [ref=e259]:
            - paragraph [ref=e260]: Project Brain v2
            - generic [ref=e261]:
              - generic [ref=e262]:
                - paragraph [ref=e263]: Files indexed
                - paragraph [ref=e264]: "2"
              - generic [ref=e265]:
                - paragraph [ref=e266]: Symbols
                - paragraph [ref=e267]: "1"
              - generic [ref=e268]:
                - paragraph [ref=e269]: API routes
                - paragraph [ref=e270]: "0"
              - generic [ref=e271]:
                - paragraph [ref=e272]: Unguarded routes
                - paragraph [ref=e273]: "0"
              - generic [ref=e274]:
                - paragraph [ref=e275]: Env vars
                - paragraph [ref=e276]: "0"
              - generic [ref=e277]:
                - paragraph [ref=e278]: Missing env docs
                - paragraph [ref=e279]: "0"
          - generic [ref=e280]:
            - paragraph [ref=e281]: Product Brain
            - paragraph [ref=e282]: BootRise command workspace
            - generic [ref=e283]:
              - paragraph [ref=e284]: Users
              - list [ref=e285]:
                - listitem [ref=e286]: "- Operators"
            - generic [ref=e287]:
              - paragraph [ref=e288]: Workflows
              - list [ref=e289]:
                - listitem [ref=e290]: "- import"
                - listitem [ref=e291]: "- fix"
                - listitem [ref=e292]: "- verify"
                - listitem [ref=e293]: "- draft_pr"
            - generic [ref=e294]:
              - paragraph [ref=e295]: Policies
              - list [ref=e296]:
                - listitem [ref=e297]: "- Approval required before PR"
            - generic [ref=e298]:
              - paragraph [ref=e299]: Roadmap
              - list [ref=e300]:
                - listitem [ref=e301]: "- Ship workspace E2E (in_progress)"
            - generic [ref=e302]:
              - paragraph [ref=e303]: Known risks
              - list [ref=e304]:
                - listitem [ref=e305]: "- Auth redirects need strict coverage"
            - generic [ref=e306]:
              - paragraph [ref=e307]: Definition of done
              - list [ref=e308]:
                - listitem [ref=e309]: "- Patch approved"
                - listitem [ref=e310]: "- Verify passed"
                - listitem [ref=e311]: "- Draft PR opened"
            - generic [ref=e312]:
              - 'textbox "Correct Product Brain: \"That policy is wrong\", \"Add this business rule\", ..." [ref=e313]'
              - button "Save correction" [disabled]:
                - generic: Save correction
          - generic [ref=e314]:
            - generic [ref=e315]:
              - paragraph [ref=e316]: Architecture roadmap
              - paragraph [ref=e317]: nextjs
              - paragraph [ref=e318]: Workspace and admin surfaces are wired for smoke coverage.
            - generic [ref=e319]:
              - paragraph [ref=e320]: Maturity
              - paragraph [ref=e321]: closed beta
            - generic [ref=e322]:
              - paragraph [ref=e323]: Production readiness
              - paragraph [ref=e324]: safe for staging
            - generic [ref=e325]:
              - paragraph [ref=e326]: Missing now
              - list [ref=e327]:
                - listitem [ref=e328]: • More edge-case coverage
            - generic [ref=e329]:
              - paragraph [ref=e330]: Security policies
              - list [ref=e331]:
                - listitem [ref=e332]: • Workspace auth gate
                - listitem [ref=e333]: • Admin authorization
            - generic [ref=e334]:
              - paragraph [ref=e335]: Suggested phases
              - list [ref=e336]:
                - listitem [ref=e337]: • Ship Playwright harness
            - generic [ref=e338]:
              - paragraph [ref=e339]: Acceptance criteria
              - list [ref=e340]:
                - listitem [ref=e341]: • Workspace flow covered
                - listitem [ref=e342]: • Admin routes covered
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