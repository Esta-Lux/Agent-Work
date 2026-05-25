import { AdminAIChatbox } from "@/components/admin-ai-chatbox";
import { BuilderOSConsole } from "@/components/builder-os-console";
import { DeepTestPanel } from "@/components/deep-test-panel";
import { InfrastructureControlPanel } from "@/components/infrastructure-control-panel";
import { MissionControlDashboard } from "@/components/mission-control-dashboard";
import { ProductionReadinessPanel } from "@/components/production-readiness-panel";
import { UnitEconomicsPanel } from "@/components/unit-economics-panel";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-cloud">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-6 py-7">
          <nav className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xl font-semibold text-ink">BootRise Admin</p>
              <p className="mt-1 text-sm text-steel">Executive command center for AI engineering operations</p>
            </div>
            <a className="rounded border border-line px-4 py-2 text-sm font-semibold text-graphite" href="/">
              Back to Workspace
            </a>
          </nav>
          <div className="py-8">
            <p className="text-sm font-semibold uppercase text-signal">Platform Nervous System</p>
            <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-normal text-ink">
              Track planning speed, sandbox pressure, AI recovery loops, and launch readiness.
            </h1>
          </div>
        </div>
      </section>

      <BuilderOSConsole />

      <section className="mx-auto max-w-7xl px-6 py-4">
        <details className="rounded border border-line bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold uppercase text-steel">
            Supporting command center panels
          </summary>
          <div className="mt-4 space-y-4">
            <AdminAIChatbox />
            <DeepTestPanel />
            <MissionControlDashboard />
            <UnitEconomicsPanel />
            <InfrastructureControlPanel />
            <ProductionReadinessPanel />
          </div>
        </details>
      </section>
    </main>
  );
}
