import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import type { User } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import type { ServiceClient } from "./auth.ts";

export { Stripe };

export type Plan = "free" | "pro" | "elite" | "sensei";
export type PaidPlan = Exclude<Plan, "free">;

export const PAID_PLANS: readonly PaidPlan[] = ["pro", "elite", "sensei"];

// Test-mode catalogue. Live mode reads STRIPE_PRICE_<PLAN> and
// STRIPE_PRODUCT_<PLAN> (e.g. STRIPE_PRICE_PRO) from the function secrets.
const TEST_PRICE_IDS: Record<PaidPlan, string> = {
  pro: "price_1SQSL1DLrTr0qdOpfIx50iSu",
  elite: "price_1SQSLMDLrTr0qdOpffTBpoJL",
  sensei: "price_1SQSM0DLrTr0qdOpYtZFR50d",
};
const TEST_PRODUCT_IDS: Record<PaidPlan, string> = {
  pro: "prod_TNCk7vRlC8fceD",
  elite: "prod_TNCkyK26dRxZ2p",
  sensei: "prod_TNClwYw2iSTuXI",
};

// Secret (sk_) and restricted (rk_) keys both exist in live mode.
function isLiveMode(): boolean {
  return /^(sk|rk)_live_/.test(Deno.env.get("STRIPE_SECRET_KEY") ?? "");
}

// A live key with the test catalogue would fail every checkout and map every
// paid subscription to the free plan: missing live IDs are a configuration error.
function catalogue(kind: "PRICE" | "PRODUCT"): Record<PaidPlan, string> {
  const fallback = kind === "PRICE" ? TEST_PRICE_IDS : TEST_PRODUCT_IDS;
  const ids = {} as Record<PaidPlan, string>;
  for (const plan of PAID_PLANS) {
    const configured = Deno.env.get(`STRIPE_${kind}_${plan.toUpperCase()}`)?.trim();
    if (!configured && isLiveMode()) {
      throw new Error(`STRIPE_${kind}_${plan.toUpperCase()} is not set (required with a live Stripe key)`);
    }
    ids[plan] = configured || fallback[plan];
  }
  return ids;
}

function planOf(kind: "PRICE" | "PRODUCT", id: string | null | undefined): PaidPlan | null {
  if (!id) return null;
  const ids = catalogue(kind);
  return PAID_PLANS.find((plan) => ids[plan] === id) ?? null;
}

export function isPaidPlan(value: unknown): value is PaidPlan {
  return typeof value === "string" && (PAID_PLANS as readonly string[]).includes(value);
}

export function checkoutPriceFor(plan: PaidPlan): string {
  return catalogue("PRICE")[plan];
}

export function planFromPriceId(priceId: string | null | undefined): PaidPlan | null {
  return planOf("PRICE", priceId);
}

// Stripe statuses that grant access to the paid plan.
const ENTITLED_STATUSES = new Set<Stripe.Subscription.Status>(["active", "trialing"]);

export const USER_ID_METADATA_KEY = "supabase_user_id";

export function createStripe(): Stripe {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2025-08-27.basil" });
}

// Throws on an unknown product/price: silently mapping a paying customer to
// the free plan would hide the misconfiguration (the webhook is retried by
// Stripe once the catalogue is fixed).
export function planFromSubscription(sub: Stripe.Subscription): PaidPlan {
  const price = sub.items?.data?.[0]?.price;
  const product = price?.product;
  const productId = typeof product === "string" ? product : product?.id;
  const plan = planOf("PRODUCT", productId) ?? planOf("PRICE", price?.id);
  if (!plan) throw new Error(`Unknown Stripe product ${productId ?? "?"} / price ${price?.id ?? "?"} on ${sub.id}`);
  return plan;
}

// Since API version 2025-03-31.basil the billing period lives on each
// subscription item, no longer on the subscription itself.
export function periodFromSubscription(sub: Stripe.Subscription): { start: string | null; end: string | null } {
  const item = sub.items?.data?.[0];
  return { start: tsToIso(item?.current_period_start), end: tsToIso(item?.current_period_end) };
}

function tsToIso(seconds: number | null | undefined): string | null {
  return typeof seconds === "number" && Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : null;
}

function customerIdOf(sub: Stripe.Subscription): string {
  return typeof sub.customer === "string" ? sub.customer : sub.customer.id;
}

// Arguments for the sync_stripe_subscription RPC. A subscription that is not
// entitled (canceled, unpaid, incomplete…) always maps to the free plan.
export function syncArgs(userId: string, sub: Stripe.Subscription) {
  const period = periodFromSubscription(sub);
  const entitled = ENTITLED_STATUSES.has(sub.status);
  return {
    p_user_id: userId,
    p_stripe_customer_id: customerIdOf(sub),
    p_stripe_subscription_id: sub.id,
    p_stripe_price_id: sub.items?.data?.[0]?.price?.id ?? null,
    p_plan: entitled ? planFromSubscription(sub) : "free",
    // The DB grants paid access on status = 'active' only.
    p_status: entitled ? "active" : sub.status,
    p_current_period_start: period.start,
    p_current_period_end: period.end,
    p_cancel_at_period_end: sub.cancel_at_period_end ?? false,
  };
}

// Writes a Stripe subscription onto the user's row. A non-entitled
// subscription never overwrites a row that tracks a *different* subscription:
// the end of an old subscription must not downgrade a newer paid one, and
// out-of-order events cannot revert the current state.
export async function syncSubscriptionRow(
  supabase: ServiceClient,
  userId: string,
  sub: Stripe.Subscription,
): Promise<{ args: ReturnType<typeof syncArgs>; skipped: boolean }> {
  const args = syncArgs(userId, sub);
  if (args.p_plan === "free") {
    const { data: row, error } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(`subscriptions lookup failed: ${error.message}`);
    const tracked = row?.stripe_subscription_id as string | null | undefined;
    if (tracked && tracked !== sub.id) return { args, skipped: true };
  }
  const { error } = await supabase.rpc("sync_stripe_subscription", args);
  if (error) throw new Error(`sync_stripe_subscription failed: ${error.message}`);
  return { args, skipped: false };
}

// Picks the subscription that should drive the user's plan: entitled first,
// then the most recently created one.
export function pickRelevantSubscription(subs: Stripe.Subscription[]): Stripe.Subscription | null {
  const sorted = [...subs].sort((a, b) => b.created - a.created);
  return sorted.find((s) => ENTITLED_STATUSES.has(s.status)) ?? sorted[0] ?? null;
}

// Finds the Stripe customer of an app user without trusting email alone:
// 1. the customer id already stored on the user's subscription row;
// 2. a customer with the same *confirmed* email that is not tagged with
//    another user id. An untagged match is claimed (tagged) on first use so it
//    can never be matched to a different account later.
export async function findCustomerId(supabase: ServiceClient, stripe: Stripe, user: User): Promise<string | null> {
  const { data: row, error } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(`subscriptions lookup failed: ${error.message}`);
  if (row?.stripe_customer_id) return row.stripe_customer_id as string;

  if (!user.email || !user.email_confirmed_at) return null;
  const { data: customers } = await stripe.customers.list({ email: user.email, limit: 10 });
  const owned = customers.find((c: Stripe.Customer) => c.metadata?.[USER_ID_METADATA_KEY] === user.id);
  if (owned) return owned.id;
  const unowned = customers.find((c: Stripe.Customer) => !c.metadata?.[USER_ID_METADATA_KEY]);
  if (!unowned) return null;
  await stripe.customers.update(unowned.id, { metadata: { [USER_ID_METADATA_KEY]: user.id } });
  return unowned.id;
}

export async function getOrCreateCustomerId(supabase: ServiceClient, stripe: Stripe, user: User): Promise<string> {
  const existing = await findCustomerId(supabase, stripe, user);
  if (existing) return existing;
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { [USER_ID_METADATA_KEY]: user.id },
  });
  return customer.id;
}
