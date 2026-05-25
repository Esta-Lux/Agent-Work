import { BuilderWorkspace } from "@/components/builder-workspace";
import { BlueprintPanel } from "@/components/blueprint-panel";
import { EvidencePanel } from "@/components/evidence-panel";
import { HealthLane } from "@/components/health-lane";
import { InfrastructureControlPanel } from "@/components/infrastructure-control-panel";
import { LivingLedgerPanel } from "@/components/living-ledger-panel";
import { PlanPanel } from "@/components/plan-panel";
import { MetricCard } from "@/components/metric-card";
import { MissionControlDashboard } from "@/components/mission-control-dashboard";
import { OperationsLedgerPanel } from "@/components/operations-ledger-panel";
import { RecommendationList } from "@/components/recommendation-list";
import { WorkflowStep } from "@/components/workflow-step";
import { demoPlan, demoRepo, demoRequest } from "@/lib/demo/demo-repo";
import { createRepoHealthSummary } from "@/lib/reporting/repo-health";
import { createVerificationSummary } from "@/lib/verification/verification-summary";

export default function Home() {
  const sourceCount = demoRepo.files.filter((file) => file.role === "source").length;
  const health = createRepoHealthSummary(demoRepo);
  const verification = createVerificationSummary(demoPlan);

  return (
    <main className="min-h-screen bg-cloud">
      <section className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-7">
          <nav className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xl font-semibold text-ink">BootRise</p>
              <p className="mt-1 text-sm text-steel">Architecture-aware AI engineering reliability</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a className="rounded border border-line px-4 py-2 text-sm font-semibold text-graphite" href="#workflow">
                How It Works
              </a>
              <a className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white" href="#workspace">
                Open Workspace
              </a>
            </div>
          </nav>

          <div className="grid gap-8 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase text-signal">AI Safe Refactoring Platform</p>
              <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-normal text-ink">
                Software changes that start with understanding.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-graphite">
                BootRise maps a repository, plans the blast radius, executes approved changes, and verifies the runtime
                before a refactor is trusted.
              </p>
            </div>
            <div className="rounded border border-line bg-cloud p-4">
              <p className="text-sm font-semibold text-steel">Current Request</p>
              <p className="mt-2 text-xl font-semibold text-ink">{demoRequest}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded bg-white px-3 py-2 text-sm text-graphite">Plan first</span>
                <span className="rounded bg-white px-3 py-2 text-sm text-graphite">Risk visible</span>
                <span className="rounded bg-white px-3 py-2 text-sm text-graphite">Verify before done</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-6 md:grid-cols-4">
        <MetricCard label="Files mapped" value={String(demoRepo.files.length)} detail="Source, schema, API, and UI files." />
        <MetricCard label="Source files" value={String(sourceCount)} detail="Application files included in analysis." />
        <MetricCard label="Symbols found" value={String(demoRepo.symbols.length)} detail="Functions and components in the graph." />
        <MetricCard label="Risk level" value={demoPlan.risk.level} detail="Driven by auth and schema impact." />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-4">
        <HealthLane health={health} />
      </section>

      <LivingLedgerPanel />

      <OperationsLedgerPanel />

      <BlueprintPanel />

      <MissionControlDashboard />

      <InfrastructureControlPanel />

      <section id="workspace" className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase text-steel">Operator Workspace</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Review before execution</h2>
          </div>
          <button className="rounded bg-signal px-4 py-2 text-sm font-semibold text-white">Approve Dry Run</button>
        </div>
        <PlanPanel plan={demoPlan} />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-4">
        <EvidencePanel verification={verification} />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-4">
        <RecommendationList items={health.recommendations} />
      </section>

      <BuilderWorkspace />

      <section id="workflow" className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase text-steel">Clean Usage Flow</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Use BootRise like an engineering review room</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <WorkflowStep
            eyebrow="1. Connect"
            title="Point it at a repo"
            body="Start with local repo ingestion, then persist intelligence snapshots as the product matures."
          />
          <WorkflowStep
            eyebrow="2. Request"
            title="Describe the change"
            body="Ask for a refactor, migration, route move, auth update, or dependency cleanup."
          />
          <WorkflowStep
            eyebrow="3. Review"
            title="Approve a plan"
            body="Inspect impacted files, blast radius, risk, validations, and rollback before code changes."
          />
          <WorkflowStep
            eyebrow="4. Verify"
            title="Trust evidence"
            body="Ship only after type, build, test, route, API, and visual checks are reported."
          />
        </div>
      </section>
    </main>
  );
}
