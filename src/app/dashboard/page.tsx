import { AuthGate } from "@/components/auth-gate";
import { ProjectDashboardPage } from "@/components/workspace/project-dashboard-page";

export default function DashboardPage() {
  return (
    <AuthGate>
      <ProjectDashboardPage />
    </AuthGate>
  );
}
