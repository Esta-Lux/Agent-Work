import { getSandboxProviderReadiness } from "@/lib/sandbox/sandbox-provider";
import { StatusPill } from "@/components/ui/status-pill";

export function SandboxReadinessCard() {
  const readiness = getSandboxProviderReadiness();
  const provider = readiness.provider;
  return (
    <article className="rounded-lg border border-border-admin bg-panel-admin p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text-admin-1">Sandbox readiness</h2>
        <StatusPill variant={provider.configured ? "signal" : "amber"} label={provider.name} />
      </div>
      <p className="mt-2 text-sm text-text-admin-2">{readiness.warning}</p>
      <ul className="mt-3 space-y-1 text-xs text-text-admin-2">
        <li>Frontend preview: {provider.supportsFrontendPreview ? "available" : "not configured"}</li>
        <li>Backend execution: {provider.supportsBackendExecution ? "available" : "not configured"}</li>
        <li>Network isolation: {provider.supportsNetworkIsolation ? "available" : "not configured"}</li>
      </ul>
      {readiness.missingEnvVars.length ? <p className="mt-3 font-mono text-xs text-amber-600">Missing: {readiness.missingEnvVars.join(", ")}</p> : null}
    </article>
  );
}
