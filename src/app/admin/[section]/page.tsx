import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { AdminControlHub } from "@/components/admin-control-hub";
import { AdminDetectionsPanel } from "@/components/admin-detections-panel";
import { AdminKillSwitches } from "@/components/admin-kill-switches";
import { AdminAuditPage } from "@/components/admin/admin-audit-page";
import { AdminDataPage } from "@/components/admin/admin-data-page";
import { AdminOverview } from "@/components/admin/admin-overview";
import { AdminShell, type AdminSection } from "@/components/admin/admin-shell";
import { AdminAgentConsole } from "@/components/admin-agent-console";
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
  if (section === "self-agent") return <AdminAgentConsole />;
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
  if (section === "data") return <AdminDataPage />;
  return <AdminAuditPage />;
}
