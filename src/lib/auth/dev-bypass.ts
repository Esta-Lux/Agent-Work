import { resolveDevAuthBypass } from "@/lib/auth/resolve-dev-auth-bypass";

/** Server-side dev bypass (never active in production). */
export function isServerDevAuthBypass(): boolean {
  return resolveDevAuthBypass(process.env);
}

/** Client bundle — set via next.config `env` from the same rules. */
export function isClientDevAuthBypass(): boolean {
  return process.env.NEXT_PUBLIC_BOOTRISE_DEV_AUTH_BYPASS === "1";
}
