# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace.e2e.spec.ts >> workspace full loop: multi-pass rerun approve verify open draft PR
- Location: tests/e2e/workspace.e2e.spec.ts:36:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Run multi-pass' })

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
          - paragraph [ref=e22]: Run Fix is the next safe step.
        - generic [ref=e23]:
          - button "Guide" [ref=e24] [cursor=pointer]:
            - generic [ref=e25]: Guide
          - button "Mode" [ref=e27] [cursor=pointer]:
            - generic [ref=e28]: Mode
          - button "Run Fix" [active] [ref=e29] [cursor=pointer]:
            - generic [ref=e30]: Run Fix
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
          - paragraph [ref=e91]: Fix
          - paragraph [ref=e92]: Split complex tasks into work units and execute controlled patches.
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
            - paragraph [ref=e139]: ×3 · no file mapping
            - button "Suggest scoped fix →" [ref=e140] [cursor=pointer]
      - complementary [ref=e141]:
        - generic [ref=e142]:
          - paragraph [ref=e143]: Context inspector
          - generic [ref=e144]:
            - heading "fix" [level=2] [ref=e145]
            - generic [ref=e146]: repo loaded
        - generic [ref=e147]:
          - generic [ref=e151]:
            - generic [ref=e152]: "!"
            - generic [ref=e153]:
              - paragraph [ref=e154]: Needs attention
              - paragraph [ref=e155]: Should access and billing changes apply globally, per workspace, or per project owner?
          - generic [ref=e156]:
            - generic [ref=e157]:
              - paragraph [ref=e158]: Agent council
              - generic [ref=e159]:
                - paragraph [ref=e160]: Agent status
                - paragraph [ref=e161]: "Active: Architect Conversation Agent"
              - generic [ref=e162]:
                - article [ref=e163]:
                  - generic [ref=e164]:
                    - paragraph [ref=e165]: Architect Agent
                    - generic [ref=e166]: passed
                  - paragraph [ref=e167]: Roadmap created and app type detected.
                - article [ref=e168]:
                  - generic [ref=e169]:
                    - paragraph [ref=e170]: Project Brain Agent
                    - generic [ref=e171]: passed
                  - paragraph [ref=e172]: Indexed 2 files with 0 routes.
                - article [ref=e173]:
                  - generic [ref=e174]:
                    - paragraph [ref=e175]: Product Brain Agent
                    - generic [ref=e176]: passed
                  - paragraph [ref=e177]: Tracking 4 workflow(s) and 1 policies.
                - article [ref=e178]:
                  - generic [ref=e179]:
                    - paragraph [ref=e180]: Architect Conversation Agent
                    - generic [ref=e181]: running
                  - paragraph [ref=e182]: This task touches high-risk boundaries, so assumptions must be confirmed before patching.
                - article [ref=e183]:
                  - generic [ref=e184]:
                    - paragraph [ref=e185]: Scope Agent
                    - generic [ref=e186]: running
                  - paragraph [ref=e187]: Scope locks start after planning.
                - article [ref=e188]:
                  - generic [ref=e189]:
                    - paragraph [ref=e190]: Builder Agent
                    - generic [ref=e191]: idle
                  - paragraph [ref=e192]: Patch pending.
                - article [ref=e193]:
                  - generic [ref=e194]:
                    - paragraph [ref=e195]: Security Agent
                    - generic [ref=e196]: idle
                  - paragraph [ref=e197]: Security scan not run.
                - article [ref=e198]:
                  - generic [ref=e199]:
                    - paragraph [ref=e200]: QA Agent
                    - generic [ref=e201]: idle
                  - paragraph [ref=e202]: Verify is pending.
                - article [ref=e203]:
                  - generic [ref=e204]:
                    - paragraph [ref=e205]: Deployment Agent
                    - generic [ref=e206]: passed
                  - paragraph [ref=e207]: Deploy readiness not run.
            - generic [ref=e208]:
              - generic [ref=e209]:
                - generic [ref=e210]: Fix request
                - textbox "Fix request" [ref=e211]:
                  - /placeholder: Describe one scoped change...
                  - text: Refactor workspace shell to use scoped work units.
              - generic [ref=e212]:
                - generic [ref=e213]:
                  - paragraph [ref=e214]: Plan summary
                  - generic [ref=e215]: fast
                - paragraph [ref=e216]: "Provider: BootRise. Approval gate remains required before workspace changes are applied."
                - button "Compare providers" [ref=e217] [cursor=pointer]:
                  - generic [ref=e218]: Compare providers
              - generic [ref=e219]:
                - generic [ref=e220]:
                  - paragraph [ref=e221]: Architect conversation
                  - generic [ref=e222]: high risk
                - paragraph [ref=e223]: This task touches high-risk boundaries, so assumptions must be confirmed before patching.
                - paragraph [ref=e224]: "Question: Should access and billing changes apply globally, per workspace, or per project owner?"
                - paragraph [ref=e225]: "Recommended: Prefer least-privilege scope and keep tenant boundaries explicit."
                - button "Approve assumptions" [ref=e226] [cursor=pointer]:
                  - generic [ref=e227]: Approve assumptions
            - generic [ref=e228]:
              - paragraph [ref=e229]: Project Brain v2
              - generic [ref=e230]:
                - generic [ref=e231]:
                  - paragraph [ref=e232]: Files indexed
                  - paragraph [ref=e233]: "2"
                - generic [ref=e234]:
                  - paragraph [ref=e235]: Symbols
                  - paragraph [ref=e236]: "1"
                - generic [ref=e237]:
                  - paragraph [ref=e238]: API routes
                  - paragraph [ref=e239]: "0"
                - generic [ref=e240]:
                  - paragraph [ref=e241]: Unguarded routes
                  - paragraph [ref=e242]: "0"
                - generic [ref=e243]:
                  - paragraph [ref=e244]: Env vars
                  - paragraph [ref=e245]: "0"
                - generic [ref=e246]:
                  - paragraph [ref=e247]: Missing env docs
                  - paragraph [ref=e248]: "0"
            - generic [ref=e249]:
              - paragraph [ref=e250]: Product Brain
              - paragraph [ref=e251]: BootRise command workspace
              - generic [ref=e252]:
                - paragraph [ref=e253]: Users
                - list [ref=e254]:
                  - listitem [ref=e255]: "- Operators"
              - generic [ref=e256]:
                - paragraph [ref=e257]: Workflows
                - list [ref=e258]:
                  - listitem [ref=e259]: "- import"
                  - listitem [ref=e260]: "- fix"
                  - listitem [ref=e261]: "- verify"
                  - listitem [ref=e262]: "- draft_pr"
              - generic [ref=e263]:
                - paragraph [ref=e264]: Policies
                - list [ref=e265]:
                  - listitem [ref=e266]: "- Approval required before PR"
              - generic [ref=e267]:
                - paragraph [ref=e268]: Roadmap
                - list [ref=e269]:
                  - listitem [ref=e270]: "- Ship workspace E2E (in_progress)"
              - generic [ref=e271]:
                - paragraph [ref=e272]: Known risks
                - list [ref=e273]:
                  - listitem [ref=e274]: "- Auth redirects need strict coverage"
              - generic [ref=e275]:
                - paragraph [ref=e276]: Definition of done
                - list [ref=e277]:
                  - listitem [ref=e278]: "- Patch approved"
                  - listitem [ref=e279]: "- Verify passed"
                  - listitem [ref=e280]: "- Draft PR opened"
              - generic [ref=e281]:
                - 'textbox "Correct Product Brain: \"That policy is wrong\", \"Add this business rule\", ..." [ref=e282]'
                - button "Save correction" [disabled]:
                  - generic: Save correction
            - generic [ref=e283]:
              - generic [ref=e284]:
                - paragraph [ref=e285]: Architecture roadmap
                - paragraph [ref=e286]: nextjs
                - paragraph [ref=e287]: Workspace and admin surfaces are wired for smoke coverage.
              - generic [ref=e288]:
                - paragraph [ref=e289]: Maturity
                - paragraph [ref=e290]: closed beta
              - generic [ref=e291]:
                - paragraph [ref=e292]: Production readiness
                - paragraph [ref=e293]: safe for staging
              - generic [ref=e294]:
                - paragraph [ref=e295]: Missing now
                - list [ref=e296]:
                  - listitem [ref=e297]: • More edge-case coverage
              - generic [ref=e298]:
                - paragraph [ref=e299]: Security policies
                - list [ref=e300]:
                  - listitem [ref=e301]: • Workspace auth gate
                  - listitem [ref=e302]: • Admin authorization
              - generic [ref=e303]:
                - paragraph [ref=e304]: Suggested phases
                - list [ref=e305]:
                  - listitem [ref=e306]: • Ship Playwright harness
              - generic [ref=e307]:
                - paragraph [ref=e308]: Acceptance criteria
                - list [ref=e309]:
                  - listitem [ref=e310]: • Workspace flow covered
                  - listitem [ref=e311]: • Admin routes covered
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
  19  |     await expect(this.page.getByText("src/app/page.tsx")).toBeVisible();
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
> 90  |     await this.page.getByRole("button", { name: "Run multi-pass" }).click();
      |                                                                     ^ Error: locator.click: Test timeout of 60000ms exceeded.
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