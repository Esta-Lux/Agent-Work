import { AuthGate } from "@/components/auth-gate";
import { WorkspaceShellV2 } from "@/components/workspace/workspace-shell-v2";

export default function Home() {
  return (
    <AuthGate>
      <WorkspaceShellV2 />
    </AuthGate>
  );
}
