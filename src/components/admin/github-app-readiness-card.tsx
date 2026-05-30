import { getGithubAppReadiness } from "@/lib/github/github-app-readiness";
import { StatusPill } from "@/components/ui/status-pill";

export function GithubAppReadinessCard() {
  const readiness = getGithubAppReadiness();
  const configured = readiness.appIdConfigured && readiness.clientIdConfigured && readiness.privateKeyConfigured;
  return (
    <article className="rounded-lg border border-border-admin bg-panel-admin p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text-admin-1">GitHub App readiness</h2>
        <StatusPill variant={configured ? "signal" : "amber"} label={configured ? "configured" : "partial"} />
      </div>
      <ul className="mt-3 space-y-1 text-xs text-text-admin-2">
        <li>GitHub public import: {readiness.publicImportAvailable ? "available" : "missing"}</li>
        <li>GitHub token fallback: {readiness.tokenFallbackAvailable ? "available" : "missing"}</li>
        <li>GitHub App install: {configured ? "configured" : "missing"}</li>
        <li>Draft PR route: {readiness.draftPrRouteAvailable ? "available" : "missing"}</li>
      </ul>
      {readiness.missingEnvVars.length ? <p className="mt-3 font-mono text-xs text-amber-600">Missing: {readiness.missingEnvVars.join(", ")}</p> : null}
    </article>
  );
}
