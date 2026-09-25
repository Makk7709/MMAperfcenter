import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import type { User } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import type { ServiceClient } from "./auth.ts";

export { Stripe };

export type Plan = "free" | "pro" | "elite" | "sensei";

// Single source of truth for Stripe → plan mapping.
// Update BOTH maps with the live-mode IDs before going live.
export const PRODUCT_TO_PLAN: Record<string, Exclude<Plan, "free">> = {
  prod_TNCk7vRlC8fceD: "pro",
  prod_TNCkyK26dRxZ2p: "elite",
  prod_TNClwYw2iSTuXI: "sensei",
};

// Prices a client is allowed to check out with. Anything else is rejected.
export const CHECKOUT_PRICE_TO_PLAN: Record<string, Exclude<Plan, "free">> = {
  price_1SQSL1DLrTr0qdOpfIx50iSu: "pro",
  price_1SQSLMDLrTr0qdOpffTBpoJL: "elite",
  price_1SQSM0DLrTr0qdOpYtZFR50d: "sensei",
};

// Stripe statuses that grant access to the paid plan.
const ENTITLED_STATUSES = new Set<Stripe.Subscription.Status>(["active", "trialing"]);

export const USER_ID_METADATA_KEY = "supabase_user_id";

export function createStripe(): Stripe {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2025-08-27.basil" });
}

export function planFromSubscription(sub: Stripe.Subscription): Plan {
  const product = sub.items?.data?.[0]?.price?.product;
  const productId = typeof product === "string" ? product : product?.id;
  return (productId && PRODUCT_TO_PLAN[productId]) || "free";
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

// Picks the subscription that should drive the user's plan: entitled first,
// then the most recently created one.
export function pickRelevantSubscription(subs: Stripe.Subscription[]): Stripe.Subscription | null {
  const sorted = [...subs].sort((a, b) => b.created - a.created);
  return sorted.find((s) => ENTITLED_STATUSES.has(s.status)) ?? sorted[0] ?? null;
}

// Finds the Stripe customer of an app user without trusting email alone:
// 1. the customer id already stored on the user's subscription row;
// 2. a customer with the same email that is not tagged with another user id.
export async function findCustomerId(supabase: ServiceClient, stripe: Stripe, user: User): Promise<string | null> {
  const { data: row } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (row?.stripe_customer_id) return row.stripe_customer_id as string;

  if (!user.email) return null;
  const { data: customers } = await stripe.customers.list({ email: user.email, limit: 10 });
  const match = customers.find((c: Stripe.Customer) => {
    const owner = c.metadata?.[USER_ID_METADATA_KEY];
    return !owner || owner === user.id;
  });
  return match?.id ?? null;
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
