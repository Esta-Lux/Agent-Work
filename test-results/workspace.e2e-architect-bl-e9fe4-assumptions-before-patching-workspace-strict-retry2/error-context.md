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

Locator: getByText('src/app/page.tsx')
Expected: visible
Error: strict mode violation: getByText('src/app/page.tsx') resolved to 2 elements:
    1) <p title="src/app/page.tsx" class="truncate font-mono text-xs font-medium text-text-ws-1">src/app/page.tsx</p> aka getByText('src/app/page.tsx', { exact: true })
    2) <p class="text-xs text-steel">×2 · src/app/page.tsx, src/components/status.tsx</p> aka getByText('×2 · src/app/page.tsx, src/')

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
            - paragraph [ref=e134]: Deploy readiness ready for production.
            - paragraph [ref=e135]: ×5 · no file mapping
            - button "Suggest scoped fix →" [ref=e136] [cursor=pointer]
          - generic [ref=e137]:
            - paragraph [ref=e138]: "Security scan complete. Critical findings: 0."
            - paragraph [ref=e139]: ×6 · no file mapping
            - button "Suggest scoped fix →" [ref=e140] [cursor=pointer]
          - generic [ref=e141]:
            - paragraph [ref=e142]: Provider duel comparison completed.
            - paragraph [ref=e143]: ×2 · src/app/page.tsx, src/components/status.tsx
            - button "Suggest scoped fix →" [ref=e144] [cursor=pointer]
      - complementary [ref=e145]:
        - generic [ref=e146]:
          - paragraph [ref=e147]: Context inspector
          - generic [ref=e148]:
            - heading "brief" [level=2] [ref=e149]
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
                  - generic [ref=e192]: idle
                - paragraph [ref=e193]: Security scan not run.
              - article [ref=e194]:
                - generic [ref=e195]:
                  - paragraph [ref=e196]: QA Agent
                  - generic [ref=e197]: idle
                - paragraph [ref=e198]: Verify is pending.
              - article [ref=e199]:
                - generic [ref=e200]:
                  - paragraph [ref=e201]: Deployment Agent
                  - generic [ref=e202]: passed
                - paragraph [ref=e203]: Deploy readiness not run.
          - generic [ref=e204]:
            - generic [ref=e205]:
              - generic [ref=e206]: Product name
              - textbox "Product name" [ref=e207]: Agent Work
            - generic [ref=e208]:
              - generic [ref=e209]: Audience
              - textbox "Audience" [ref=e210]
            - generic [ref=e211]:
              - generic [ref=e212]: Primary workflow
              - textbox "Primary workflow" [ref=e213]: Ship the core user workflow
            - generic [ref=e214]:
              - button "Auth" [ref=e215] [cursor=pointer]
              - button "Payments" [ref=e216] [cursor=pointer]
          - generic [ref=e217]:
            - paragraph [ref=e218]: Project Brain v2
            - generic [ref=e219]:
              - generic [ref=e220]:
                - paragraph [ref=e221]: Files indexed
                - paragraph [ref=e222]: "2"
              - generic [ref=e223]:
                - paragraph [ref=e224]: Symbols
                - paragraph [ref=e225]: "1"
              - generic [ref=e226]:
                - paragraph [ref=e227]: API routes
                - paragraph [ref=e228]: "0"
              - generic [ref=e229]:
                - paragraph [ref=e230]: Unguarded routes
                - paragraph [ref=e231]: "0"
              - generic [ref=e232]:
                - paragraph [ref=e233]: Env vars
                - paragraph [ref=e234]: "0"
              - generic [ref=e235]:
                - paragraph [ref=e236]: Missing env docs
                - paragraph [ref=e237]: "0"
          - generic [ref=e238]:
            - paragraph [ref=e239]: Product Brain
            - paragraph [ref=e240]: BootRise command workspace
            - generic [ref=e241]:
              - paragraph [ref=e242]: Users
              - list [ref=e243]:
                - listitem [ref=e244]: "- Operators"
            - generic [ref=e245]:
              - paragraph [ref=e246]: Workflows
              - list [ref=e247]:
                - listitem [ref=e248]: "- import"
                - listitem [ref=e249]: "- fix"
                - listitem [ref=e250]: "- verify"
                - listitem [ref=e251]: "- draft_pr"
            - generic [ref=e252]:
              - paragraph [ref=e253]: Policies
              - list [ref=e254]:
                - listitem [ref=e255]: "- Approval required before PR"
            - generic [ref=e256]:
              - paragraph [ref=e257]: Roadmap
              - list [ref=e258]:
                - listitem [ref=e259]: "- Ship workspace E2E (in_progress)"
            - generic [ref=e260]:
              - paragraph [ref=e261]: Known risks
              - list [ref=e262]:
                - listitem [ref=e263]: "- Auth redirects need strict coverage"
            - generic [ref=e264]:
              - paragraph [ref=e265]: Definition of done
              - list [ref=e266]:
                - listitem [ref=e267]: "- Patch approved"
                - listitem [ref=e268]: "- Verify passed"
                - listitem [ref=e269]: "- Draft PR opened"
            - generic [ref=e270]:
              - 'textbox "Correct Product Brain: \"That policy is wrong\", \"Add this business rule\", ..." [ref=e271]'
              - button "Save correction" [disabled]:
                - generic: Save correction
          - generic [ref=e272]:
            - generic [ref=e273]:
              - paragraph [ref=e274]: Architecture roadmap
              - paragraph [ref=e275]: nextjs
              - paragraph [ref=e276]: Workspace and admin surfaces are wired for smoke coverage.
            - generic [ref=e277]:
              - paragraph [ref=e278]: Maturity
              - paragraph [ref=e279]: closed beta
            - generic [ref=e280]:
              - paragraph [ref=e281]: Production readiness
              - paragraph [ref=e282]: safe for staging
            - generic [ref=e283]:
              - paragraph [ref=e284]: Missing now
              - list [ref=e285]:
                - listitem [ref=e286]: • More edge-case coverage
            - generic [ref=e287]:
              - paragraph [ref=e288]: Security policies
              - list [ref=e289]:
                - listitem [ref=e290]: • Workspace auth gate
                - listitem [ref=e291]: • Admin authorization
            - generic [ref=e292]:
              - paragraph [ref=e293]: Suggested phases
              - list [ref=e294]:
                - listitem [ref=e295]: • Ship Playwright harness
            - generic [ref=e296]:
              - paragraph [ref=e297]: Acceptance criteria
              - list [ref=e298]:
                - listitem [ref=e299]: • Workspace flow covered
                - listitem [ref=e300]: • Admin routes covered
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