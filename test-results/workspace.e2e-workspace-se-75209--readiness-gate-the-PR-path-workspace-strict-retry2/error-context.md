# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace.e2e.spec.ts >> workspace security scan and deploy readiness gate the PR path
- Location: tests/e2e/workspace.e2e.spec.ts:50:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('src/app/page.tsx')
Expected: visible
Error: strict mode violation: getByText('src/app/page.tsx') resolved to 2 elements:
    1) <p title="src/app/page.tsx" class="truncate font-mono text-xs font-medium text-text-ws-1">src/app/page.tsx</p> aka getByText('src/app/page.tsx', { exact: true })
    2) <p class="text-xs text-steel">×1 · src/app/page.tsx, src/components/status.tsx</p> aka getByText('×1 · src/app/page.tsx, src/')

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByText('src/app/page.tsx')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
          - paragraph [ref=e22]: Complete brief is the next safe step.
        - generic [ref=e23]:
          - button "Guide" [ref=e24] [cursor=pointer]:
            - generic [ref=e25]: Guide
          - button "Mode" [ref=e27] [cursor=pointer]:
            - generic [ref=e28]: Mode
          - button "Complete brief" [ref=e29] [cursor=pointer]:
            - generic [ref=e30]: Complete brief
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
            - button "2 Brain Context + roadmap" [ref=e63] [cursor=pointer]:
              - generic [ref=e64]: "2"
              - generic [ref=e65]:
                - generic [ref=e66]: Brain
                - generic [ref=e67]: Context + roadmap
          - listitem [ref=e69]:
            - button "3 Fix Work units + patch" [ref=e70] [cursor=pointer]:
              - generic [ref=e71]: "3"
              - generic [ref=e72]:
                - generic [ref=e73]: Fix
                - generic [ref=e74]: Work units + patch
          - listitem [ref=e76]:
            - button "4 Security Scan + verify" [ref=e77] [cursor=pointer]:
              - generic [ref=e78]: "4"
              - generic [ref=e79]:
                - generic [ref=e80]: Security
                - generic [ref=e81]: Scan + verify
          - listitem [ref=e83]:
            - button "5 PR Preflight + draft PR" [ref=e84] [cursor=pointer]:
              - generic [ref=e85]: "5"
              - generic [ref=e86]:
                - generic [ref=e87]: PR
                - generic [ref=e88]: Preflight + draft PR
        - generic [ref=e89]:
          - paragraph [ref=e90]: Operator focus
          - paragraph [ref=e91]: Brain
          - paragraph [ref=e92]: Build Project Brain and architecture roadmap from live repository files.
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
            - paragraph [ref=e134]: Provider duel comparison completed.
            - paragraph [ref=e135]: ×1 · src/app/page.tsx, src/components/status.tsx
            - button "Suggest scoped fix →" [ref=e136] [cursor=pointer]
          - generic [ref=e137]:
            - paragraph [ref=e138]: "Security scan complete. Critical findings: 0."
            - paragraph [ref=e139]: ×5 · no file mapping
            - button "Suggest scoped fix →" [ref=e140] [cursor=pointer]
      - complementary [ref=e141]:
        - generic [ref=e142]:
          - paragraph [ref=e143]: Context inspector
          - generic [ref=e144]:
            - heading "brief" [level=2] [ref=e145]
            - generic [ref=e146]: repo loaded
        - generic [ref=e148]:
          - generic [ref=e149]:
            - paragraph [ref=e150]: Agent council
            - generic [ref=e151]:
              - paragraph [ref=e152]: Agent status
              - paragraph [ref=e153]: "Active: Architect Agent"
            - generic [ref=e154]:
              - article [ref=e155]:
                - generic [ref=e156]:
                  - paragraph [ref=e157]: Architect Agent
                  - generic [ref=e158]: passed
                - paragraph [ref=e159]: Roadmap created and app type detected.
              - article [ref=e160]:
                - generic [ref=e161]:
                  - paragraph [ref=e162]: Project Brain Agent
                  - generic [ref=e163]: passed
                - paragraph [ref=e164]: Indexed 2 files with 0 routes.
              - article [ref=e165]:
                - generic [ref=e166]:
                  - paragraph [ref=e167]: Product Brain Agent
                  - generic [ref=e168]: passed
                - paragraph [ref=e169]: Tracking 4 workflow(s) and 1 policies.
              - article [ref=e170]:
                - generic [ref=e171]:
                  - paragraph [ref=e172]: Architect Conversation Agent
                  - generic [ref=e173]: idle
                - paragraph [ref=e174]: Describe the task in one scoped sentence before patching.
              - article [ref=e175]:
                - generic [ref=e176]:
                  - paragraph [ref=e177]: Scope Agent
                  - generic [ref=e178]: idle
                - paragraph [ref=e179]: Scope locks start after planning.
              - article [ref=e180]:
                - generic [ref=e181]:
                  - paragraph [ref=e182]: Builder Agent
                  - generic [ref=e183]: idle
                - paragraph [ref=e184]: Patch pending.
              - article [ref=e185]:
                - generic [ref=e186]:
                  - paragraph [ref=e187]: Security Agent
                  - generic [ref=e188]: idle
                - paragraph [ref=e189]: Security scan not run.
              - article [ref=e190]:
                - generic [ref=e191]:
                  - paragraph [ref=e192]: QA Agent
                  - generic [ref=e193]: idle
                - paragraph [ref=e194]: Verify is pending.
              - article [ref=e195]:
                - generic [ref=e196]:
                  - paragraph [ref=e197]: Deployment Agent
                  - generic [ref=e198]: passed
                - paragraph [ref=e199]: Deploy readiness not run.
          - generic [ref=e200]:
            - generic [ref=e201]:
              - generic [ref=e202]: Product name
              - textbox "Product name" [ref=e203]: Agent Work
            - generic [ref=e204]:
              - generic [ref=e205]: Audience
              - textbox "Audience" [ref=e206]
            - generic [ref=e207]:
              - generic [ref=e208]: Primary workflow
              - textbox "Primary workflow" [ref=e209]: Ship the core user workflow
            - generic [ref=e210]:
              - button "Auth" [ref=e211] [cursor=pointer]
              - button "Payments" [ref=e212] [cursor=pointer]
          - generic [ref=e213]:
            - paragraph [ref=e214]: Project Brain v2
            - generic [ref=e215]:
              - generic [ref=e216]:
                - paragraph [ref=e217]: Files indexed
                - paragraph [ref=e218]: "2"
              - generic [ref=e219]:
                - paragraph [ref=e220]: Symbols
                - paragraph [ref=e221]: "1"
              - generic [ref=e222]:
                - paragraph [ref=e223]: API routes
                - paragraph [ref=e224]: "0"
              - generic [ref=e225]:
                - paragraph [ref=e226]: Unguarded routes
                - paragraph [ref=e227]: "0"
              - generic [ref=e228]:
                - paragraph [ref=e229]: Env vars
                - paragraph [ref=e230]: "0"
              - generic [ref=e231]:
                - paragraph [ref=e232]: Missing env docs
                - paragraph [ref=e233]: "0"
          - generic [ref=e234]:
            - paragraph [ref=e235]: Product Brain
            - paragraph [ref=e236]: BootRise command workspace
            - generic [ref=e237]:
              - paragraph [ref=e238]: Users
              - list [ref=e239]:
                - listitem [ref=e240]: "- Operators"
            - generic [ref=e241]:
              - paragraph [ref=e242]: Workflows
              - list [ref=e243]:
                - listitem [ref=e244]: "- import"
                - listitem [ref=e245]: "- fix"
                - listitem [ref=e246]: "- verify"
                - listitem [ref=e247]: "- draft_pr"
            - generic [ref=e248]:
              - paragraph [ref=e249]: Policies
              - list [ref=e250]:
                - listitem [ref=e251]: "- Approval required before PR"
            - generic [ref=e252]:
              - paragraph [ref=e253]: Roadmap
              - list [ref=e254]:
                - listitem [ref=e255]: "- Ship workspace E2E (in_progress)"
            - generic [ref=e256]:
              - paragraph [ref=e257]: Known risks
              - list [ref=e258]:
                - listitem [ref=e259]: "- Auth redirects need strict coverage"
            - generic [ref=e260]:
              - paragraph [ref=e261]: Definition of done
              - list [ref=e262]:
                - listitem [ref=e263]: "- Patch approved"
                - listitem [ref=e264]: "- Verify passed"
                - listitem [ref=e265]: "- Draft PR opened"
            - generic [ref=e266]:
              - 'textbox "Correct Product Brain: \"That policy is wrong\", \"Add this business rule\", ..." [ref=e267]'
              - button "Save correction" [disabled]:
                - generic: Save correction
          - generic [ref=e268]:
            - generic [ref=e269]:
              - paragraph [ref=e270]: Architecture roadmap
              - paragraph [ref=e271]: nextjs
              - paragraph [ref=e272]: Workspace and admin surfaces are wired for smoke coverage.
            - generic [ref=e273]:
              - paragraph [ref=e274]: Maturity
              - paragraph [ref=e275]: closed beta
            - generic [ref=e276]:
              - paragraph [ref=e277]: Production readiness
              - paragraph [ref=e278]: safe for staging
            - generic [ref=e279]:
              - paragraph [ref=e280]: Missing now
              - list [ref=e281]:
                - listitem [ref=e282]: • More edge-case coverage
            - generic [ref=e283]:
              - paragraph [ref=e284]: Security policies
              - list [ref=e285]:
                - listitem [ref=e286]: • Workspace auth gate
                - listitem [ref=e287]: • Admin authorization
            - generic [ref=e288]:
              - paragraph [ref=e289]: Suggested phases
              - list [ref=e290]:
                - listitem [ref=e291]: • Ship Playwright harness
            - generic [ref=e292]:
              - paragraph [ref=e293]: Acceptance criteria
              - list [ref=e294]:
                - listitem [ref=e295]: • Workspace flow covered
                - listitem [ref=e296]: • Admin routes covered
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
> 19  |     await expect(this.page.getByText("src/app/page.tsx")).toBeVisible();
      |                                                           ^ Error: expect(locator).toBeVisible() failed
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
  32  |     if (await approveAssumptions.isVisible().catch(() => false)) {
  33  |       await approveAssumptions.click();
  34  |       await this.page.getByRole("button", { name: "Run Fix" }).click();
  35  |     }
  36  |     const useSinglePass = this.page.getByRole("button", { name: "Use single-pass fix" });
  37  |     if (options?.autoSinglePass !== false && await useSinglePass.isVisible().catch(() => false)) {
  38  |       await useSinglePass.click();
  39  |     }
  40  |     if (options?.expectApprove !== false) {
  41  |       await expect(this.page.getByRole("button", { name: "Approve patch" })).toBeVisible();
  42  |     }
  43  |   }
  44  | 
  45  |   async openGuide() {
  46  |     await this.page.getByRole("button", { name: "Guide" }).click();
  47  |     await expect(this.page.getByRole("dialog", { name: "BootRise guided tour" })).toBeVisible();
  48  |     await this.page.getByRole("button", { name: "Skip tour" }).click();
  49  |   }
  50  | 
  51  |   async compareProviders() {
  52  |     await this.page.getByRole("button", { name: "Compare providers" }).click();
  53  |     await expect(this.page.getByText("Provider duel", { exact: true })).toBeVisible();
  54  |   }
  55  | 
  56  |   async approvePatch() {
  57  |     await this.page.getByRole("button", { name: "Approve patch" }).click();
  58  |     await expect(this.page.getByRole("button", { name: "Run Verify" })).toBeVisible();
  59  |   }
  60  | 
  61  |   async runVerify() {
  62  |     await this.page.getByRole("button", { name: "Run Verify" }).click();
  63  |     await this.page.waitForTimeout(500);
  64  |   }
  65  | 
  66  |   async runSecurityScan() {
  67  |     await this.page.getByRole("button", { name: "Run security scan" }).click();
  68  |     await expect(this.page.getByText("Security scan complete")).toBeVisible();
  69  |   }
  70  | 
  71  |   async runDeployReadiness() {
  72  |     await this.page.getByRole("button", { name: "Run deploy readiness" }).click();
  73  |     await expect(this.page.getByText("Deploy readiness complete")).toBeVisible();
  74  |   }
  75  | 
  76  |   async exportBundle() {
  77  |     const exportButton = this.page.getByRole("button", { name: "Export bundle" }).first();
  78  |     if (await exportButton.isVisible().catch(() => false)) {
  79  |       await exportButton.click();
  80  |       await expect(this.page.getByText("Export bundle saved to /tmp/bootrise-export.zip")).toBeVisible();
  81  |     }
  82  |   }
  83  | 
  84  |   async openDraftPr() {
  85  |     await this.page.getByRole("button", { name: "Open draft PR" }).click();
  86  |     await expect(this.page.getByText("https://github.com/Esta-Lux/Agent-Work/pull/123")).toBeVisible();
  87  |   }
  88  | 
  89  |   async runMultiPass() {
  90  |     await this.page.getByRole("button", { name: "Run multi-pass" }).click();
  91  |     await expect(this.page.getByText("Work unit execution")).toBeVisible();
  92  |   }
  93  | 
  94  |   async rerunWorkUnit() {
  95  |     await this.page.getByRole("button", { name: "Re-run unit" }).first().click();
  96  |     await expect(this.page.getByText("Work unit rerun complete")).toBeVisible();
  97  |   }
  98  | 
  99  |   async saveProductBrainCorrection() {
  100 |     await this.page
  101 |       .getByPlaceholder('Correct Product Brain: "That policy is wrong", "Add this business rule", ...')
  102 |       .fill("Correction: add edge-case review.");
  103 |     await this.page.getByRole("button", { name: "Save correction" }).click();
  104 |   }
  105 | }
  106 | 
```