import { AuthGate } from "@/components/auth-gate";
import { WorkspaceShellV2 } from "@/components/workspace/workspace-shell-v2";

export default function ProjectWorkspacePage({
  params
}: {
  params: { projectId: string };
}) {
  return (
    <AuthGate>
      <WorkspaceShellV2 initialProjectId={params.projectId} />
    </AuthGate>
  );
}
