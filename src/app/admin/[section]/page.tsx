import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { AdminControlHub } from "@/components/admin-control-hub";
import { AdminDetectionsPanel } from "@/components/admin-detections-panel";
import { AdminKillSwitches } from "@/components/admin-kill-switches";
import { AdminOverview } from "@/components/admin/admin-overview";
import { AdminShell, type AdminSection } from "@/components/admin/admin-shell";
import { SelfAgentPage } from "@/components/admin/self-agent-page";
import { PlatformStatusBar } from "@/components/platform-status-bar";
import { ProductionReadinessPanel } from "@/components/production-readiness-panel";
import { UnitEconomicsPanel } from "@/components/unit-economics-panel";
import { SectionHeader } from "@/components/ui/section-header";

const sections: AdminSection[] = ["overview", "self-agent", "readiness", "providers", "data", "usage", "control", "security", "audit"];

export const dynamic = "force-dynamic";

export default async function AdminSectionPage({ params }: { params: { section: string } }) {
  await requireAdmin();
  const section = params.section as AdminSection;
  if (!sections.includes(section)) notFound();

  return <AdminShell currentSection={section}>{renderSection(section)}</AdminShell>;
}

function renderSection(section: AdminSection) {
  if (section === "overview") return <AdminOverview />;
  if (section === "self-agent") return <SelfAgentPage />;
  if (section === "readiness") return <ProductionReadinessPanel />;
  if (section === "providers") {
    return (
      <div className="space-y-6">
        <SectionHeader theme="admin" eyebrow="PROVIDERS" title="AI provider health" description="Live provider and Supabase checks from the existing operational endpoints." />
        <PlatformStatusBar variant="admin" />
      </div>
    );
  }
  if (section === "usage") return <UnitEconomicsPanel />;
  if (section === "control") {
    return (
      <div className="space-y-6">
        <SectionHeader theme="admin" eyebrow="CONTROL" title="Control layer" description="Kill switches and control telemetry stay wired to the existing admin APIs." />
        <div className="rounded-lg border border-border-admin bg-panel-admin p-4">
          <AdminKillSwitches />
        </div>
        <div className="rounded-lg border border-border-admin bg-panel-admin p-4">
          <AdminControlHub />
        </div>
      </div>
    );
  }
  if (section === "security") {
    return (
      <div className="space-y-6">
        <SectionHeader theme="admin" eyebrow="SECURITY" title="Security detections" description="Operational detections and watchdog status from the existing admin scanner." />
        <div className="rounded-lg border border-border-admin bg-panel-admin p-4">
          <AdminDetectionsPanel />
        </div>
      </div>
    );
  }
  if (section === "data") return <EmptyAdminSection title="Supabase data management" description="This section will collect schema status, migration helpers, table health, and data maintenance actions." />;
  return <EmptyAdminSection title="Audit trail" description="This section will show admin actions, mission approvals, security events, and system changes." />;
}

function EmptyAdminSection({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <SectionHeader theme="admin" eyebrow="OPS SECTION" title={title} description={description} />
      <div className="rounded-lg border border-border-admin bg-panel-admin p-10 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-signal-glow font-mono text-xs text-signal">BR</div>
        <h2 className="mt-4 text-base font-semibold text-text-admin-1">{title}</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-admin-2">{description}</p>
      </div>
    </div>
  );
}
