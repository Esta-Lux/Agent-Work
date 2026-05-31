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
          - generic [ref=e15]: Dev
          - generic [ref=e16]: dev@bootrise.local
          - button "Sign out" [ref=e17] [cursor=pointer]
    - generic [ref=e18]:
      - generic [ref=e19]:
        - generic [ref=e20]:
          - paragraph [ref=e21]: BootRise Command Center
          - heading "Agent Work" [level=1] [ref=e22]
          - paragraph [ref=e23]: Complete brief is the next safe step.
        - generic [ref=e24]:
          - button "Guide" [ref=e25] [cursor=pointer]:
            - generic [ref=e26]: Guide
          - button "Mode" [ref=e28] [cursor=pointer]:
            - generic [ref=e29]: Mode
          - button "Complete brief" [ref=e30] [cursor=pointer]:
            - generic [ref=e31]: Complete brief
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
            - button "2 Brain Context + roadmap" [ref=e64] [cursor=pointer]:
              - generic [ref=e65]: "2"
              - generic [ref=e66]:
                - generic [ref=e67]: Brain
                - generic [ref=e68]: Context + roadmap
          - listitem [ref=e70]:
            - button "3 Fix Work units + patch" [ref=e71] [cursor=pointer]:
              - generic [ref=e72]: "3"
              - generic [ref=e73]:
                - generic [ref=e74]: Fix
                - generic [ref=e75]: Work units + patch
          - listitem [ref=e77]:
            - button "4 Security Scan + verify" [ref=e78] [cursor=pointer]:
              - generic [ref=e79]: "4"
              - generic [ref=e80]:
                - generic [ref=e81]: Security
                - generic [ref=e82]: Scan + verify
          - listitem [ref=e84]:
            - button "5 PR Preflight + draft PR" [ref=e85] [cursor=pointer]:
              - generic [ref=e86]: "5"
              - generic [ref=e87]:
                - generic [ref=e88]: PR
                - generic [ref=e89]: Preflight + draft PR
        - generic [ref=e90]:
          - paragraph [ref=e91]: Operator focus
          - paragraph [ref=e92]: Brain
          - paragraph [ref=e93]: Build Project Brain and architecture roadmap from live repository files.
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
            - paragraph [ref=e136]: ×2 · no file mapping
            - button "Suggest scoped fix →" [ref=e137] [cursor=pointer]
          - generic [ref=e138]:
            - paragraph [ref=e139]: "Security scan complete. Critical findings: 0."
            - paragraph [ref=e140]: ×3 · no file mapping
            - button "Suggest scoped fix →" [ref=e141] [cursor=pointer]
          - generic [ref=e142]:
            - paragraph [ref=e143]: Provider duel comparison completed.
            - paragraph [ref=e144]: ×1 · src/app/page.tsx, src/components/status.tsx
            - button "Suggest scoped fix →" [ref=e145] [cursor=pointer]
      - complementary [ref=e146]:
        - generic [ref=e147]:
          - paragraph [ref=e148]: Context inspector
          - generic [ref=e149]:
            - heading "brief" [level=2] [ref=e150]
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
                  - generic [ref=e193]: idle
                - paragraph [ref=e194]: Security scan not run.
              - article [ref=e195]:
                - generic [ref=e196]:
                  - paragraph [ref=e197]: QA Agent
                  - generic [ref=e198]: idle
                - paragraph [ref=e199]: Verify is pending.
              - article [ref=e200]:
                - generic [ref=e201]:
                  - paragraph [ref=e202]: Deployment Agent
                  - generic [ref=e203]: passed
                - paragraph [ref=e204]: Deploy readiness not run.
          - generic [ref=e205]:
            - generic [ref=e206]:
              - generic [ref=e207]: Product name
              - textbox "Product name" [ref=e208]: Agent Work
            - generic [ref=e209]:
              - generic [ref=e210]: Audience
              - textbox "Audience" [ref=e211]
            - generic [ref=e212]:
              - generic [ref=e213]: Primary workflow
              - textbox "Primary workflow" [ref=e214]: Ship the core user workflow
            - generic [ref=e215]:
              - button "Auth" [ref=e216] [cursor=pointer]
              - button "Payments" [ref=e217] [cursor=pointer]
          - generic [ref=e218]:
            - paragraph [ref=e219]: Project Brain v2
            - generic [ref=e220]:
              - generic [ref=e221]:
                - paragraph [ref=e222]: Files indexed
                - paragraph [ref=e223]: "2"
              - generic [ref=e224]:
                - paragraph [ref=e225]: Symbols
                - paragraph [ref=e226]: "1"
              - generic [ref=e227]:
                - paragraph [ref=e228]: API routes
                - paragraph [ref=e229]: "0"
              - generic [ref=e230]:
                - paragraph [ref=e231]: Unguarded routes
                - paragraph [ref=e232]: "0"
              - generic [ref=e233]:
                - paragraph [ref=e234]: Env vars
                - paragraph [ref=e235]: "0"
              - generic [ref=e236]:
                - paragraph [ref=e237]: Missing env docs
                - paragraph [ref=e238]: "0"
          - generic [ref=e239]:
            - paragraph [ref=e240]: Product Brain
            - paragraph [ref=e241]: BootRise command workspace
            - generic [ref=e242]:
              - paragraph [ref=e243]: Users
              - list [ref=e244]:
                - listitem [ref=e245]: "- Operators"
            - generic [ref=e246]:
              - paragraph [ref=e247]: Workflows
              - list [ref=e248]:
                - listitem [ref=e249]: "- import"
                - listitem [ref=e250]: "- fix"
                - listitem [ref=e251]: "- verify"
                - listitem [ref=e252]: "- draft_pr"
            - generic [ref=e253]:
              - paragraph [ref=e254]: Policies
              - list [ref=e255]:
                - listitem [ref=e256]: "- Approval required before PR"
            - generic [ref=e257]:
              - paragraph [ref=e258]: Roadmap
              - list [ref=e259]:
                - listitem [ref=e260]: "- Ship workspace E2E (in_progress)"
            - generic [ref=e261]:
              - paragraph [ref=e262]: Known risks
              - list [ref=e263]:
                - listitem [ref=e264]: "- Auth redirects need strict coverage"
            - generic [ref=e265]:
              - paragraph [ref=e266]: Definition of done
              - list [ref=e267]:
                - listitem [ref=e268]: "- Patch approved"
                - listitem [ref=e269]: "- Verify passed"
                - listitem [ref=e270]: "- Draft PR opened"
            - generic [ref=e271]:
              - 'textbox "Correct Product Brain: \"That policy is wrong\", \"Add this business rule\", ..." [ref=e272]'
              - button "Save correction" [disabled]:
                - generic: Save correction
          - generic [ref=e273]:
            - generic [ref=e274]:
              - paragraph [ref=e275]: Architecture roadmap
              - paragraph [ref=e276]: nextjs
              - paragraph [ref=e277]: Workspace and admin surfaces are wired for smoke coverage.
            - generic [ref=e278]:
              - paragraph [ref=e279]: Maturity
              - paragraph [ref=e280]: closed beta
            - generic [ref=e281]:
              - paragraph [ref=e282]: Production readiness
              - paragraph [ref=e283]: safe for staging
            - generic [ref=e284]:
              - paragraph [ref=e285]: Missing now
              - list [ref=e286]:
                - listitem [ref=e287]: • More edge-case coverage
            - generic [ref=e288]:
              - paragraph [ref=e289]: Security policies
              - list [ref=e290]:
                - listitem [ref=e291]: • Workspace auth gate
                - listitem [ref=e292]: • Admin authorization
            - generic [ref=e293]:
              - paragraph [ref=e294]: Suggested phases
              - list [ref=e295]:
                - listitem [ref=e296]: • Ship Playwright harness
            - generic [ref=e297]:
              - paragraph [ref=e298]: Acceptance criteria
              - list [ref=e299]:
                - listitem [ref=e300]: • Workspace flow covered
                - listitem [ref=e301]: • Admin routes covered
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