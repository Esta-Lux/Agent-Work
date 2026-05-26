import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { getSupabaseServiceClient } from "@/lib/db/supabase";
import { estimateCreditsForAction } from "@/lib/usage/credit-pricing";

export interface CreditBalance {
  orgId: string;
  includedCredits: number;
  usedCredits: number;
  premiumCreditCap: number;
  premiumCreditsUsed: number;
  remaining: number;
}

const storePath = resolve(process.cwd(), ".bootrise", "credits.json");

function loadLocal(): Record<string, CreditBalance> {
  if (!existsSync(storePath)) return {};
  try {
    return JSON.parse(readFileSync(storePath, "utf8")) as Record<string, CreditBalance>;
  } catch {
    return {};
  }
}

function saveLocal(all: Record<string, CreditBalance>) {
  mkdirSync(join(storePath, ".."), { recursive: true });
  writeFileSync(storePath, JSON.stringify(all, null, 2), "utf8");
}

function defaultBalance(orgId: string): CreditBalance {
  const included = Number(process.env.BOOTRISE_DEFAULT_INCLUDED_CREDITS ?? 10_000);
  return {
    orgId,
    includedCredits: included,
    usedCredits: 0,
    premiumCreditCap: Number(process.env.BOOTRISE_PREMIUM_CREDIT_CAP ?? 500),
    premiumCreditsUsed: 0,
    remaining: included
  };
}

export async function getCreditBalance(orgId: string): Promise<CreditBalance> {
  const supabase = getSupabaseServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from("bootrise_credit_balances")
      .select("*")
      .eq("org_id", orgId)
      .order("period_end", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      const included = data.included_credits as number;
      const used = data.used_credits as number;
      return {
        orgId,
        includedCredits: included,
        usedCredits: used,
        premiumCreditCap: data.premium_credit_cap as number,
        premiumCreditsUsed: data.premium_credits_used as number,
        remaining: Math.max(0, included - used)
      };
    }
  }
  const local = loadLocal()[orgId];
  if (local) return local;
  const balance = defaultBalance(orgId);
  const all = loadLocal();
  all[orgId] = balance;
  saveLocal(all);
  return balance;
}

export async function assertCreditsAvailable(orgId: string, action: string): Promise<number> {
  const cost = estimateCreditsForAction(action);
  const balance = await getCreditBalance(orgId);
  if (balance.remaining < cost) {
    throw new Error(`Insufficient credits: need ${cost}, have ${balance.remaining}.`);
  }
  return cost;
}

export async function chargeCredits(input: {
  orgId: string;
  userId: string;
  action: string;
  credits?: number;
}): Promise<CreditBalance> {
  const cost = input.credits ?? estimateCreditsForAction(input.action);
  const balance = await getCreditBalance(input.orgId);
  balance.usedCredits += cost;
  balance.remaining = Math.max(0, balance.includedCredits - balance.usedCredits);

  const all = loadLocal();
  all[input.orgId] = balance;
  saveLocal(all);

  const supabase = getSupabaseServiceClient();
  if (supabase) {
    const id = `bal_${input.orgId}_${Date.now()}`;
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    await supabase.from("bootrise_credit_balances").upsert({
      id,
      org_id: input.orgId,
      period_start: now.toISOString(),
      period_end: periodEnd.toISOString(),
      included_credits: balance.includedCredits,
      used_credits: balance.usedCredits,
      premium_credit_cap: balance.premiumCreditCap,
      premium_credits_used: balance.premiumCreditsUsed,
      updated_at: now.toISOString()
    });
    await supabase.from("bootrise_credit_transactions").insert({
      id: `txn_${Date.now()}`,
      org_id: input.orgId,
      user_id: input.userId,
      action: input.action,
      credits: cost,
      balance_after: balance.remaining,
      metadata: {}
    });
  }

  return balance;
}
