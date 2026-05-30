const DEFAULT_STAGED_INCLUDED_CREDITS = 1_000_000;

export function isCreditEnforcementEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.BOOTRISE_ENFORCE_CREDITS === "1";
}

export function resolveStagedIncludedCredits(env: NodeJS.ProcessEnv = process.env): number {
  if (typeof env.BOOTRISE_STAGED_INCLUDED_CREDITS !== "undefined") {
    return parsePositiveCredits(env.BOOTRISE_STAGED_INCLUDED_CREDITS);
  }
  if (typeof env.BOOTRISE_DEV_BYPASS_INCLUDED_CREDITS !== "undefined") {
    return parsePositiveCredits(env.BOOTRISE_DEV_BYPASS_INCLUDED_CREDITS);
  }
  return DEFAULT_STAGED_INCLUDED_CREDITS;
}

function parsePositiveCredits(value: string): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_STAGED_INCLUDED_CREDITS;
}
