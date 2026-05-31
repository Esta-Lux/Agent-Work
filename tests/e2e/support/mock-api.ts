import type { Page, Route } from "playwright/test";

const importedFiles = [
  {
    path: "src/app/page.tsx",
    content: `export default function DemoPage() {\n  return <main>BootRise demo workspace</main>;\n}\n`
  },
  {
    path: "src/components/status.tsx",
    content: `export function Status() {\n  return <div>Status: healthy</div>;\n}\n`
  }
];

const patchedFiles = [
  {
    path: "src/app/page.tsx",
    content: `export default function DemoPage() {\n  return <main>BootRise demo workspace ready for Playwright</main>;\n}\n`
  },
  importedFiles[1]
];

const pendingReport = {
  repositoryId: "repo_playwright",
  plan: {
    summary: "Tighten the workspace-to-PR happy path."
  },
  diff: {
    summary: "Update the home page copy for the approved patch."
  },
  blastRadius: ["src/app/page.tsx"],
  fixed: [{ path: "src/app/page.tsx", summary: "Clarified the shipped state." }],
  potentiallyBroken: [],
  howFixed: ["Prepared a reviewable patch and left it pending approval."],
  verificationSummary: { verdict: "pending", summary: "Waiting for approval and verify." },
  residualRisk: [],
  guidanceForBuilder: ["Approve the patch before pushing to GitHub."],
  safeToPr: {
    status: "caution",
    label: "Approve the patch and rerun verify before opening a draft PR.",
    checklist: ["Approve the pending patch", "Run verify after approval"]
  },
  pendingFixId: "fix_playwright",
  patches: [
    {
      path: "src/app/page.tsx",
      before: importedFiles[0].content,
      after: patchedFiles[0].content,
      summary: "Update the workspace landing copy."
    }
  ],
  approvalStatus: "pending_approval",
  controlLayer: {
    canApprove: true,
    status: "review_required",
    blockers: []
  }
};

const approvedReport = {
  ...pendingReport,
  approvalStatus: "approved",
  safeToPr: {
    status: "yes",
    label: "Patch approved and ready for draft PR handoff.",
    checklist: ["Verify completed", "Draft PR can be opened"]
  }
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

type MockJob = {
  id: string;
  type: string;
  status: "queued" | "running" | "completed" | "failed";
  projectId: string;
  repositoryId?: string;
  progressPercent: number;
  progressMessage: string;
  result?: unknown;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
};

function queueCompletedJob(
  jobs: Map<string, MockJob>,
  input: { type: string; projectId: string; repositoryId?: string; result: unknown; progressMessage?: string }
) {
  const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  jobs.set(id, {
    id,
    type: input.type,
    status: "completed",
    projectId: input.projectId,
    repositoryId: input.repositoryId,
    progressPercent: 100,
    progressMessage: input.progressMessage ?? "Completed",
    result: input.result,
    createdAt: now,
    updatedAt: now,
    completedAt: now
  });
  return id;
}

export async function mockWorkspaceApis(page: Page) {
  const jobs = new Map<string, MockJob>();
  const activityEvents = new Map<string, Array<Record<string, unknown>>>();
  const upsertActivity = (projectId: string, event: Record<string, unknown>) => {
    const current = activityEvents.get(projectId) ?? [];
    const id = typeof event.id === "string" ? event.id : "";
    const index = id ? current.findIndex((item) => item.id === id) : -1;
    if (index >= 0) {
      current[index] = event;
    } else {
      current.unshift(event);
    }
    activityEvents.set(projectId, current.slice(0, 200));
  };
  await page.route("**/api/workspace/jobs**", (route) => {
    const url = new URL(route.request().url());
    const jobId = url.searchParams.get("jobId") ?? "";
    const job = jobs.get(jobId);
    if (!job) return json(route, { error: "Job not found" }, 404);
    return json(route, { product: "BootRise", job });
  });
  await page.route("**/api/workspace/agent-activity**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "GET") {
      const projectId = url.searchParams.get("projectId") ?? "";
      return json(route, { product: "BootRise", events: activityEvents.get(projectId) ?? [] });
    }
    if (request.method() === "POST") {
      const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
      const projectId = typeof body.projectId === "string" ? body.projectId : "";
      const createdAt = typeof body.createdAt === "string" ? body.createdAt : new Date().toISOString();
      const event = { ...body, createdAt };
      if (projectId) upsertActivity(projectId, event);
      return json(route, { product: "BootRise", event });
    }
    return route.fallback();
  });
  await page.route("**/api/ai/providers/health", (route) =>
    json(route, {
      providers: [
        { provider: "bootrise", connected: true, model: "nvidia/bootrise", message: "BootRise engine ready" },
        { provider: "openai", connected: true, model: "gpt-5.4", message: "OpenAI fallback ready" }
      ]
    })
  );
  await page.route("**/api/workspace/credits", (route) => json(route, { remaining: 128 }));
  await page.route("**/api/workspace/github/branches**", (route) =>
    json(route, { branches: ["main", "release"], defaultBranch: "main" })
  );
  await page.route("**/api/workspace/github/import", (route) =>
    json(route, {
      repositoryId: "repo_playwright",
      files: importedFiles,
      branch: "main",
      imported: importedFiles.length,
      skipped: 0,
      mode: "full",
      source: "fixture"
    })
  );
  await page.route("**/api/workspace/architecture/roadmap", (route) =>
    json(route, {
      roadmap: {
        appType: "nextjs",
        currentMaturity: "closed_beta",
        productionReadiness: "safe_for_staging",
        currentStateSummary: "Workspace and admin surfaces are wired for smoke coverage.",
        missingCapabilities: ["More edge-case coverage"],
        securityPolicies: ["Workspace auth gate", "Admin authorization"],
        recommendedIntegrations: ["GitHub App"],
        deploymentBlockers: [],
        suggestedPhases: ["Ship Playwright harness"],
        acceptanceCriteria: ["Workspace flow covered", "Admin routes covered"],
        deferUntilLater: []
      }
    })
  );
  await page.route("**/api/workspace/product-brain", (route) => {
    const jobId = queueCompletedJob(jobs, {
      type: "productBrain.build",
      projectId: "repo_playwright",
      repositoryId: "repo_playwright",
      result: {
        productBrain: {
          projectId: "repo_playwright",
          oneLineDescription: "BootRise command workspace",
          targetUsers: ["Operators"],
          coreProblem: "Move from scoped fix to guarded PR quickly",
          primaryWorkflows: ["import", "fix", "verify", "draft_pr"],
          constraints: [],
          policies: ["Approval required before PR"],
          assumptions: [],
          definitionOfDone: ["Patch approved", "Verify passed", "Draft PR opened"],
          currentRoadmap: [{ title: "Ship workspace E2E", status: "in_progress", owner: "BootRise" }],
          knownRisks: ["Auth redirects need strict coverage"],
          recentCorrections: [],
          generatedAt: new Date().toISOString()
        }
      }
    });
    return json(route, { product: "BootRise", jobId, status: "queued" });
  });
  await page.route("**/api/workspace/fix", (route) => json(route, { report: pendingReport, repositoryId: "repo_playwright" }));
  await page.route("**/api/workspace/work-units", async (route) => {
    return json(route, {
      workUnitPlan: {
        taskSummary: "Single unit",
        totalUnits: 1,
        units: [
          {
            id: "wu_1",
            domain: "frontend_ui",
            title: "Frontend update",
            description: "Update UI copy",
            targetFiles: ["src/app/page.tsx"],
            readOnlyFiles: [],
            dependsOn: [],
            estimatedComplexity: "low",
            acceptanceCriteria: ["Page copy updated"]
          }
        ],
        executionOrder: [["wu_1"]],
        crossFileDependencyWarnings: [],
        estimatedRiskLevel: "low",
        requiresMultiPass: false
      },
      integration: { passed: true, blockers: [], warnings: [] },
      multiPass: { enabled: false, passes: [], note: "" }
    });
  });
  await page.route("**/api/workspace/fix/approve", (route) =>
    json(route, { report: approvedReport, files: patchedFiles })
  );
  await page.route("**/api/workspace/sandbox/verify", (route) =>
    json(route, {
      status: "passed",
      commands: [
        { label: "npm run typecheck", exitCode: 0, output: "typecheck ok" },
        { label: "npm test", exitCode: 0, output: "tests ok" }
      ],
      message: "Verification completed."
    })
  );
  await page.route("**/api/workspace/multi-pass", (route) => {
    const jobId = queueCompletedJob(jobs, {
      type: "multiPass.execute",
      projectId: "repo_playwright",
      repositoryId: "repo_playwright",
      result: {
        result: {
          taskId: "mp_1",
          status: "completed",
          executions: [
            {
              workUnitId: "wu_1",
              status: "patched",
              patches: pendingReport.patches,
              blockers: [],
              warnings: []
            },
            {
              workUnitId: "wu_2",
              status: "skipped",
              patches: [],
              blockers: ["Marked for rerun after upstream change."],
              warnings: []
            }
          ],
          mergedPatches: pendingReport.patches,
          finalCompletionPassed: true,
          blockers: [],
          warnings: []
        },
        runId: "run_playwright",
        report: pendingReport
      }
    });
    return json(route, { product: "BootRise", jobId, status: "queued" });
  });
  await page.route("**/api/workspace/multi-pass/rerun-unit", (route) =>
    json(route, {
      result: {
        taskId: "mp_1",
        status: "completed",
        executions: [
          {
            workUnitId: "wu_1",
            status: "patched",
            patches: pendingReport.patches,
            blockers: [],
            warnings: []
          },
          {
            workUnitId: "wu_2",
            status: "patched",
            patches: [],
            blockers: [],
            warnings: []
          }
        ],
        mergedPatches: pendingReport.patches,
        finalCompletionPassed: true,
        blockers: [],
        warnings: []
      },
      runId: "run_playwright",
      report: pendingReport
    })
  );
  await page.route("**/api/workspace/security/scan", (route) => {
    const jobId = queueCompletedJob(jobs, {
      type: "security.scan",
      projectId: "repo_playwright",
      repositoryId: "repo_playwright",
      result: {
        findings: [],
        criticalCount: 0,
        score: 96,
        semgrep: [],
        estimatedCredits: 8
      }
    });
    return json(route, { product: "BootRise", jobId, status: "queued" });
  });
  await page.route("**/api/workspace/deploy/readiness", (route) => {
    const jobId = queueCompletedJob(jobs, {
      type: "deployment.readiness",
      projectId: "repo_playwright",
      repositoryId: "repo_playwright",
      result: {
        report: {
          status: "ready_for_production",
          score: 94,
          blockers: [],
          warnings: [],
          checklist: ["Build pipeline configured", "Auth redirects configured"]
        },
        estimatedCredits: 6
      }
    });
    return json(route, { product: "BootRise", jobId, status: "queued" });
  });
  await page.route("**/api/workspace/provider-duel", (route) => {
    const jobId = queueCompletedJob(jobs, {
      type: "provider.duel",
      projectId: "repo_playwright",
      repositoryId: "repo_playwright",
      result: {
        results: [
          {
            provider: "bootrise",
            available: true,
            model: "nvidia/bootrise",
            estimatedCredits: 10,
            completionScore: 91,
            vagueOutputFindings: 0,
            securityConcerns: [],
            recommendation: "cheapest_safe",
            tokenEstimate: 620,
            costEstimate: 0.01,
            confidence: 90,
            summary: "Plan passed non-mutating guard checks."
          },
          {
            provider: "openai",
            available: true,
            model: "gpt-5.4",
            estimatedCredits: 20,
            completionScore: 94,
            vagueOutputFindings: 0,
            securityConcerns: [],
            recommendation: "most_complete",
            tokenEstimate: 680,
            costEstimate: 0.02,
            confidence: 92,
            summary: "Plan passed non-mutating guard checks."
          }
        ]
      }
    });
    return json(route, { product: "BootRise", jobId, status: "queued" });
  });
  await page.route("**/api/workspace/export", (route) =>
    json(route, { message: "Export bundle saved to /tmp/bootrise-export.zip" })
  );
  await page.route("**/api/workspace/github/pr", (route) =>
    json(route, {
      draftPr: { prUrl: "https://github.com/Esta-Lux/Agent-Work/pull/123" },
      push: { compareUrl: "https://github.com/Esta-Lux/Agent-Work/compare/bootrise/fix-playwright", branch: "bootrise/fix-playwright" }
    })
  );
}

export async function mockAdminApis(page: Page) {
  const jobs = new Map<string, MockJob>();
  await page.route("**/api/admin/workspace/jobs**", (route) => {
    const url = new URL(route.request().url());
    const jobId = url.searchParams.get("jobId");
    if (jobId) {
      const job = jobs.get(jobId);
      if (!job) return json(route, { error: "Job not found" }, 404);
      return json(route, { product: "BootRise", job });
    }
    return json(route, { product: "BootRise", jobs: Array.from(jobs.values()) });
  });
  await page.route("**/api/github/status", (route) =>
    json(route, { connected: true, account: "Esta-Lux", installationId: "inst_1" })
  );
  await page.route("**/api/ai/providers/health", (route) =>
    json(route, {
      providers: [
        { provider: "bootrise", connected: true, model: "nvidia/bootrise", message: "BootRise engine ready" },
        { provider: "openai", connected: true, model: "gpt-5.4", message: "OpenAI standby ready" }
      ]
    })
  );
  await page.route("**/api/admin/readiness**", (route) =>
    json(route, {
      report: {
        productionReady: false,
        score: 82,
        items: [
          {
            area: "E2E coverage",
            status: "needs_review",
            summary: "Workspace and admin flows are now wired to Playwright.",
            nextStep: "Ship blocked-state coverage."
          }
        ]
      }
    })
  );
  await page.route("**/api/admin/supabase/overview**", (route) =>
    json(route, {
      health: {
        configured: true,
        connected: true,
        schemaReady: true,
        projectRef: "bootrise-test",
        tables: [{ name: "bootrise_org_members", exists: true, rowCount: 2 }],
        message: "Supabase ready for operator flows."
      },
      telemetry: {
        recent: [{ id: "evt_1", finalOutcome: "approved", createdAt: "2026-05-30T07:00:00.000Z", tokenComputeCost: 42 }]
      }
    })
  );
  await page.route("**/api/admin/control-hub**", (route) =>
    json(route, {
      snapshot: {
        recentEvents: [
          { action: "approve_patch", detail: "Approved workspace patch", severity: "info", createdAt: "2026-05-30T07:01:00.000Z" }
        ]
      }
    })
  );
  await page.route("**/api/admin/build-missions**", (route) =>
    json(route, {
      missions: [
        {
          id: "mission_1",
          title: "Playwright rollout",
          status: "running",
          branchName: "bootrise/playwright-e2e",
          createdAt: "2026-05-30T07:02:00.000Z",
          summary: "Bringing workspace and admin flows under Playwright."
        }
      ]
    })
  );
  await page.route("**/api/admin/self-agent/plan", (route) =>
    json(route, {
      adminBuildMission: {
        id: "mission_scope",
        title: "Self-agent mission",
        status: "scoped",
        branchName: "bootrise/self-agent-draft",
        createdAt: "2026-05-30T07:06:00.000Z",
        objective: "Create scoped patch preview",
        affectedFiles: ["src/components/admin/self-agent-page.tsx"]
      },
      scope: {
        missionId: "mission_scope",
        totalFilesAffected: 1,
        estimatedRiskLevel: "medium",
        scopeSummary: "Scope for self-agent mission",
        safetyNote: "No direct mutation",
        workUnits: [
          {
            id: "wu_1",
            label: "backend scope",
            domain: "backend",
            targetFiles: ["src/components/admin/self-agent-page.tsx"],
            readOnlyFiles: ["src/lib/auth/with-admin-auth.ts"],
            description: "Patch preview scope",
            riskLevel: "medium"
          }
        ]
      }
    })
  );
  await page.route("**/api/admin/self-agent/patch", (route) =>
    json(route, {
      patchPreview: {
        patches: [
          {
            path: "src/components/admin/self-agent-page.tsx",
            before: "before",
            after: "after",
            summary: "Self-agent preview patch"
          }
        ],
        warnings: []
      },
      qa: { passed: true, blockers: [], warnings: [] }
    })
  );
  await page.route("**/api/admin/self-agent/approve", (route) =>
    json(route, {
      message: "Patch preview approved."
    })
  );
  await page.route("**/api/admin/self-agent/verify", (route) => {
    const jobId = queueCompletedJob(jobs, {
      type: "selfAgent.verify",
      projectId: "mission_scope",
      repositoryId: "Esta-Lux/Agent-Work",
      result: {
        mission: {
          id: "mission_scope",
          status: "branch_pushed",
          branchName: "bootrise/self-agent-draft"
        },
        verify: {
          passed: true,
          commands: [
            { label: "self-agent-guard", exitCode: 0, output: "Guard checks passed for self-agent patch preview." },
            { label: "self-agent-diff-scope", exitCode: 0, output: "Patch count: 1. Branch: bootrise/self-agent-draft." }
          ]
        }
      }
    });
    return json(route, { product: "BootRise", jobId, status: "queued" });
  });
  await page.route("**/api/admin/self-agent/pr", (route) =>
    json(route, {
      draftPr: {
        prUrl: "https://github.com/Esta-Lux/Agent-Work/pull/456",
        mode: "draft_pr"
      }
    })
  );
  await page.route("**/api/admin/kill-switches", (route) =>
    json(route, {
      killSwitches: [
        { id: "github_import", enabled: true, label: "GitHub import" },
        { id: "agent_push", enabled: true, label: "Agent push" }
      ]
    })
  );
  await page.route("**/api/admin/agent/detections**", (route) =>
    json(route, {
      detections: [
        {
          id: "det_1",
          kind: "auth_missing",
          severity: "warning",
          title: "Auth edge case needs follow-up",
          description: "Strict-auth redirect is covered; blocked-state remediation still pending.",
          detectedAt: "2026-05-30T07:03:00.000Z",
          source: "playwright",
          status: "new"
        }
      ]
    })
  );
  await page.route("**/api/admin/agent/watchdog", (route) =>
    json(route, { running: true, lastTickAt: "2026-05-30T07:04:00.000Z", lastDetections: 1 })
  );
  await page.route("**/api/admin/audit**", (route) =>
    json(route, {
      entries: [
        { id: "audit_1", actor: "BootRise", action: "open_draft_pr", detail: "Draft PR ready for review", createdAt: "2026-05-30T07:05:00.000Z" }
      ]
    })
  );
}
