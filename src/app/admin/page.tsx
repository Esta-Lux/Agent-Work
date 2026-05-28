import { requireAdmin } from "@/lib/auth/admin-auth";
import { AdminOverview } from "@/components/admin/admin-overview";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();

  return (
    <AdminShell currentSection="overview">
      <AdminOverview />
    </AdminShell>
  );
}
