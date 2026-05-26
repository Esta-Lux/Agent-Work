import { AuthGate, AuthHeaderActions } from "@/components/auth-gate";
import { BootRiseLogo } from "@/components/bootrise-logo";
import { CreditsBadge } from "@/components/credits-badge";
import { UserWorkspace } from "@/components/user-workspace";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-mesh-light">
      <div className="bootrise-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <header className="sticky top-0 z-20 border-b border-line/80 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <BootRiseLogo size="sm" />
          <div className="flex items-center gap-2">
            <CreditsBadge />
            <AuthHeaderActions />
          </div>
        </div>
      </header>

      <main className="relative">
        <AuthGate>
          <UserWorkspace />
        </AuthGate>
      </main>
    </div>
  );
}
