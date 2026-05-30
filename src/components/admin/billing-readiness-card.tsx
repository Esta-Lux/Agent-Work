import { getBillingReadiness } from "@/lib/billing/billing-readiness";
import { StatusPill } from "@/components/ui/status-pill";

export function BillingReadinessCard() {
  const readiness = getBillingReadiness();
  const ready = readiness.missingEnvVars.length === 0;
  return (
    <article className="rounded-lg border border-border-admin bg-panel-admin p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text-admin-1">Billing readiness</h2>
        <StatusPill variant={ready ? "signal" : "amber"} label={ready ? "ready" : "setup"} />
      </div>
      <ul className="mt-3 space-y-1 text-xs text-text-admin-2">
        <li>Stripe secret key: {readiness.stripeSecretKey ? "configured" : "missing"}</li>
        <li>Webhook secret: {readiness.webhookSecret ? "configured" : "missing"}</li>
        <li>Price IDs: {readiness.priceIdsConfigured ? "configured" : "missing"}</li>
        <li>Credit system: {readiness.creditPlansConfigured ? "configured" : "using defaults"}</li>
        <li>Premium credits: {readiness.premiumCreditConfig ? "configured" : "using defaults"}</li>
      </ul>
      {readiness.paidBetaBlockers.length ? <p className="mt-3 text-xs text-amber-600">{readiness.paidBetaBlockers.join(" ")}</p> : null}
    </article>
  );
}
