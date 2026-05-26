import type { ReactNode } from "react";
import { BootRiseLogo } from "@/components/bootrise-logo";

export function AuthShell({
  children,
  title,
  subtitle
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-mesh-light">
      <div className="bootrise-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:gap-16 lg:py-12">
        <section className="mb-10 lg:mb-0 lg:flex-1 animate-fade-in">
          <BootRiseLogo size="lg" />
          <h1 className="mt-10 max-w-lg text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
            Ship changes without breaking the codebase
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-steel">
            Scope, context budgets, control gates, and verified PRs — so AI agents stay inside what your
            architecture allows.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-graphite">
            {[
              "Project Brain remembers rules and conventions",
              "Control layer blocks risky patches before they land",
              "Credits-aware routing across model providers"
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="w-full lg:max-w-md animate-slide-up">
          <div className="rounded-2xl border border-line/80 bg-white/90 p-8 shadow-card backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-signal">Workspace</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-steel">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
          <p className="mt-6 text-center text-xs text-steel">
            By continuing you agree to use BootRise within your organization&apos;s scope.
          </p>
        </section>
      </div>
    </div>
  );
}
