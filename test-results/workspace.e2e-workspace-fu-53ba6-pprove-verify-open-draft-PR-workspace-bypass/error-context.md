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
          - generic [ref=e15]: Dev
          - generic [ref=e16]: dev@bootrise.local
          - button "Sign out" [ref=e17] [cursor=pointer]
    - generic [ref=e18]:
      - generic [ref=e19]:
        - generic [ref=e20]:
          - paragraph [ref=e21]: BootRise Command Center
          - heading "Agent Work" [level=1] [ref=e22]
          - paragraph [ref=e23]: Run Fix is the next safe step.
        - generic [ref=e24]:
          - button "Guide" [ref=e25] [cursor=pointer]:
            - generic [ref=e26]: Guide
          - button "Mode" [ref=e28] [cursor=pointer]:
            - generic [ref=e29]: Mode
          - button "Run Fix" [active] [ref=e30] [cursor=pointer]:
            - generic [ref=e31]: Run Fix
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
          - paragraph [ref=e92]: Fix
          - paragraph [ref=e93]: Split complex tasks into work units and execute controlled patches.
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
          - paragraph [ref=e134]: No grouped runtime errors yet. Preview/build failures appear here.
      - complementary [ref=e135]:
        - generic [ref=e136]:
          - paragraph [ref=e137]: Context inspector
          - generic [ref=e138]:
            - heading "fix" [level=2] [ref=e139]
            - generic [ref=e140]: repo loaded
        - generic [ref=e141]:
          - generic [ref=e145]:
            - generic [ref=e146]: "!"
            - generic [ref=e147]:
              - paragraph [ref=e148]: Needs attention
              - paragraph [ref=e149]: Should access and billing changes apply globally, per workspace, or per project owner?
          - generic [ref=e150]:
            - generic [ref=e151]:
              - paragraph [ref=e152]: Agent council
              - generic [ref=e153]:
                - paragraph [ref=e154]: Agent status
                - paragraph [ref=e155]: "Active: Architect Conversation Agent"
              - generic [ref=e156]:
                - article [ref=e157]:
                  - generic [ref=e158]:
                    - paragraph [ref=e159]: Architect Agent
                    - generic [ref=e160]: passed
                  - paragraph [ref=e161]: Roadmap created and app type detected.
                - article [ref=e162]:
                  - generic [ref=e163]:
                    - paragraph [ref=e164]: Project Brain Agent
                    - generic [ref=e165]: passed
                  - paragraph [ref=e166]: Indexed 2 files with 0 routes.
                - article [ref=e167]:
                  - generic [ref=e168]:
                    - paragraph [ref=e169]: Product Brain Agent
                    - generic [ref=e170]: passed
                  - paragraph [ref=e171]: Tracking 4 workflow(s) and 1 policies.
                - article [ref=e172]:
                  - generic [ref=e173]:
                    - paragraph [ref=e174]: Architect Conversation Agent
                    - generic [ref=e175]: running
                  - paragraph [ref=e176]: This task touches high-risk boundaries, so assumptions must be confirmed before patching.
                - article [ref=e177]:
                  - generic [ref=e178]:
                    - paragraph [ref=e179]: Scope Agent
                    - generic [ref=e180]: running
                  - paragraph [ref=e181]: Scope locks start after planning.
                - article [ref=e182]:
                  - generic [ref=e183]:
                    - paragraph [ref=e184]: Builder Agent
                    - generic [ref=e185]: idle
                  - paragraph [ref=e186]: Patch pending.
                - article [ref=e187]:
                  - generic [ref=e188]:
                    - paragraph [ref=e189]: Security Agent
                    - generic [ref=e190]: idle
                  - paragraph [ref=e191]: Security scan not run.
                - article [ref=e192]:
                  - generic [ref=e193]:
                    - paragraph [ref=e194]: QA Agent
                    - generic [ref=e195]: idle
                  - paragraph [ref=e196]: Verify is pending.
                - article [ref=e197]:
                  - generic [ref=e198]:
                    - paragraph [ref=e199]: Deployment Agent
                    - generic [ref=e200]: passed
                  - paragraph [ref=e201]: Deploy readiness not run.
            - generic [ref=e202]:
              - generic [ref=e203]:
                - generic [ref=e204]: Fix request
                - textbox "Fix request" [ref=e205]:
                  - /placeholder: Describe one scoped change...
                  - text: Refactor workspace shell to use scoped work units.
              - generic [ref=e206]:
                - generic [ref=e207]:
                  - paragraph [ref=e208]: Plan summary
                  - generic [ref=e209]: fast
                - paragraph [ref=e210]: "Provider: BootRise. Approval gate remains required before workspace changes are applied."
                - button "Compare providers" [ref=e211] [cursor=pointer]:
                  - generic [ref=e212]: Compare providers
              - generic [ref=e213]:
                - generic [ref=e214]:
                  - paragraph [ref=e215]: Architect conversation
                  - generic [ref=e216]: high risk
                - paragraph [ref=e217]: This task touches high-risk boundaries, so assumptions must be confirmed before patching.
                - paragraph [ref=e218]: "Question: Should access and billing changes apply globally, per workspace, or per project owner?"
                - paragraph [ref=e219]: "Recommended: Prefer least-privilege scope and keep tenant boundaries explicit."
                - button "Approve assumptions" [ref=e220] [cursor=pointer]:
                  - generic [ref=e221]: Approve assumptions
            - generic [ref=e222]:
              - paragraph [ref=e223]: Project Brain v2
              - generic [ref=e224]:
                - generic [ref=e225]:
                  - paragraph [ref=e226]: Files indexed
                  - paragraph [ref=e227]: "2"
                - generic [ref=e228]:
                  - paragraph [ref=e229]: Symbols
                  - paragraph [ref=e230]: "1"
                - generic [ref=e231]:
                  - paragraph [ref=e232]: API routes
                  - paragraph [ref=e233]: "0"
                - generic [ref=e234]:
                  - paragraph [ref=e235]: Unguarded routes
                  - paragraph [ref=e236]: "0"
                - generic [ref=e237]:
                  - paragraph [ref=e238]: Env vars
                  - paragraph [ref=e239]: "0"
                - generic [ref=e240]:
                  - paragraph [ref=e241]: Missing env docs
                  - paragraph [ref=e242]: "0"
            - generic [ref=e243]:
              - paragraph [ref=e244]: Product Brain
              - paragraph [ref=e245]: BootRise command workspace
              - generic [ref=e246]:
                - paragraph [ref=e247]: Users
                - list [ref=e248]:
                  - listitem [ref=e249]: "- Operators"
              - generic [ref=e250]:
                - paragraph [ref=e251]: Workflows
                - list [ref=e252]:
                  - listitem [ref=e253]: "- import"
                  - listitem [ref=e254]: "- fix"
                  - listitem [ref=e255]: "- verify"
                  - listitem [ref=e256]: "- draft_pr"
              - generic [ref=e257]:
                - paragraph [ref=e258]: Policies
                - list [ref=e259]:
                  - listitem [ref=e260]: "- Approval required before PR"
              - generic [ref=e261]:
                - paragraph [ref=e262]: Roadmap
                - list [ref=e263]:
                  - listitem [ref=e264]: "- Ship workspace E2E (in_progress)"
              - generic [ref=e265]:
                - paragraph [ref=e266]: Known risks
                - list [ref=e267]:
                  - listitem [ref=e268]: "- Auth redirects need strict coverage"
              - generic [ref=e269]:
                - paragraph [ref=e270]: Definition of done
                - list [ref=e271]:
                  - listitem [ref=e272]: "- Patch approved"
                  - listitem [ref=e273]: "- Verify passed"
                  - listitem [ref=e274]: "- Draft PR opened"
              - generic [ref=e275]:
                - 'textbox "Correct Product Brain: \"That policy is wrong\", \"Add this business rule\", ..." [ref=e276]'
                - button "Save correction" [disabled]:
                  - generic: Save correction
            - generic [ref=e277]:
              - generic [ref=e278]:
                - paragraph [ref=e279]: Architecture roadmap
                - paragraph [ref=e280]: nextjs
                - paragraph [ref=e281]: Workspace and admin surfaces are wired for smoke coverage.
              - generic [ref=e282]:
                - paragraph [ref=e283]: Maturity
                - paragraph [ref=e284]: closed beta
              - generic [ref=e285]:
                - paragraph [ref=e286]: Production readiness
                - paragraph [ref=e287]: safe for staging
              - generic [ref=e288]:
                - paragraph [ref=e289]: Missing now
                - list [ref=e290]:
                  - listitem [ref=e291]: • More edge-case coverage
              - generic [ref=e292]:
                - paragraph [ref=e293]: Security policies
                - list [ref=e294]:
                  - listitem [ref=e295]: • Workspace auth gate
                  - listitem [ref=e296]: • Admin authorization
              - generic [ref=e297]:
                - paragraph [ref=e298]: Suggested phases
                - list [ref=e299]:
                  - listitem [ref=e300]: • Ship Playwright harness
              - generic [ref=e301]:
                - paragraph [ref=e302]: Acceptance criteria
                - list [ref=e303]:
                  - listitem [ref=e304]: • Workspace flow covered
                  - listitem [ref=e305]: • Admin routes covered
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