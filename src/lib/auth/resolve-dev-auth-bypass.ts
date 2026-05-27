/** Shared rules for local dev auth bypass (never active in production). */
export function resolveDevAuthBypass(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV === "production") return false;
  if (env.BOOTRISE_DEV_AUTH_BYPASS === "0") return false;
  if (env.BOOTRISE_DEV_AUTH_STRICT === "1") return false;
  if (env.BOOTRISE_DEV_AUTH_BYPASS === "1") return true;
  if (env.NEXT_PUBLIC_BOOTRISE_DEV_AUTH_BYPASS === "1") return true;
  return env.NODE_ENV === "development";
}
