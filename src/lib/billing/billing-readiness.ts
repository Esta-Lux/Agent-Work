export interface BillingReadiness {
  stripeSecretKey: boolean;
  webhookSecret: boolean;
  priceIdsConfigured: boolean;
  creditPlansConfigured: boolean;
  premiumCreditConfig: boolean;
  missingEnvVars: string[];
  paidBetaBlockers: string[];
}

export function getBillingReadiness(): BillingReadiness {
  const stripeSecretKey = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  const webhookSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
  const priceIdsConfigured = Boolean(process.env.STRIPE_PRICE_ID_STARTER?.trim() || process.env.STRIPE_PRICE_ID_PRO?.trim());
  const creditPlansConfigured = Boolean(process.env.BOOTRISE_FREE_CREDITS || process.env.BOOTRISE_CREDIT_PACK);
  const premiumCreditConfig = Boolean(process.env.BOOTRISE_PREMIUM_CREDIT_MULTIPLIER || process.env.BOOTRISE_PREMIUM_CREDITS);
  const missingEnvVars = [
    stripeSecretKey ? null : "STRIPE_SECRET_KEY",
    webhookSecret ? null : "STRIPE_WEBHOOK_SECRET",
    priceIdsConfigured ? null : "STRIPE_PRICE_ID_*"
  ].filter((value): value is string => Boolean(value));

  return {
    stripeSecretKey,
    webhookSecret,
    priceIdsConfigured,
    creditPlansConfigured,
    premiumCreditConfig,
    missingEnvVars,
    paidBetaBlockers: missingEnvVars.length ? ["Stripe checkout is not enabled until required billing env vars are present."] : []
  };
}
