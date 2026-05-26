// ============================================================================
// Stripe webhook receiver
// ----------------------------------------------------------------------------
// - Verifies the Stripe signature (HMAC SHA-256 with STRIPE_WEBHOOK_SECRET).
// - Idempotency via the `stripe_webhook_events` table (RPC: is_webhook_processed
//   / mark_webhook_processed).
// - Synchronises the `subscriptions` table via the `sync_stripe_subscription`
//   RPC for the events that change subscription state:
//     * checkout.session.completed
//     * customer.subscription.created
//     * customer.subscription.updated
//     * customer.subscription.deleted
//
// Security:
//   - JWT verification is disabled for this function (Stripe authenticates via
//     signature). See supabase/config.toml.
//   - Service role key is read from Deno env and never exposed.
// ============================================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const log = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Stripe product → application plan. Kept in sync with check-subscription.
const PRODUCT_TO_PLAN: Record<string, "free" | "pro" | "elite" | "sensei"> = {
  prod_TNCk7vRlC8fceD: "pro",
  prod_TNCkyK26dRxZ2p: "elite",
  prod_TNClwYw2iSTuXI: "sensei",
};

function planFromSubscription(sub: Stripe.Subscription): "free" | "pro" | "elite" | "sensei" {
  const productId = sub.items?.data?.[0]?.price?.product as string | undefined;
  if (!productId) return "free";
  return PRODUCT_TO_PLAN[productId] ?? "free";
}

function priceIdFromSubscription(sub: Stripe.Subscription): string | null {
  return (sub.items?.data?.[0]?.price?.id as string | undefined) ?? null;
}

function tsToIso(seconds: number | null | undefined): string | null {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    log("Missing secrets", { hasKey: !!stripeKey, hasWebhookSecret: !!webhookSecret });
    return new Response(JSON.stringify({ error: "Webhook not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  // ---- Signature verification ---------------------------------------------
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    log("Missing stripe-signature header");
    return new Response(JSON.stringify({ error: "Missing signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    log("Signature verification failed", { error: err instanceof Error ? err.message : String(err) });
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  log("Event received", { id: event.id, type: event.type });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // ---- Idempotence check ---------------------------------------------------
  try {
    const { data: already, error: idemErr } = await supabase.rpc("is_webhook_processed", {
      p_event_id: event.id,
    });
    if (idemErr) {
      log("is_webhook_processed RPC error", { error: idemErr.message });
    } else if (already === true) {
      log("Event already processed, acknowledging", { id: event.id });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    log("Idempotence check failed (continuing)", { error: err instanceof Error ? err.message : String(err) });
  }

  // ---- Event routing -------------------------------------------------------
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = (session.customer as string) ?? null;
        const subscriptionId = (session.subscription as string) ?? null;

        if (customerId && subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscription(supabase, stripe, sub, customerId);
        } else {
          log("checkout.session.completed without customer/subscription", {
            customerId,
            subscriptionId,
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = (sub.customer as string) ?? null;
        if (customerId) {
          await syncSubscription(supabase, stripe, sub, customerId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = (sub.customer as string) ?? null;
        const userId = await resolveUserId(supabase, stripe, customerId);
        if (userId) {
          await supabase.rpc("sync_stripe_subscription", {
            p_user_id: userId,
            p_stripe_customer_id: customerId,
            p_stripe_subscription_id: sub.id,
            p_stripe_price_id: priceIdFromSubscription(sub),
            p_plan: "free",
            p_status: "canceled",
            p_current_period_start: tsToIso(sub.current_period_start),
            p_current_period_end: tsToIso(sub.current_period_end),
            p_cancel_at_period_end: sub.cancel_at_period_end ?? false,
          });
          log("Subscription canceled and synced", { userId, subscriptionId: sub.id });
        }
        break;
      }

      default:
        log("Event type not handled", { type: event.type });
        break;
    }

    // ---- Mark as processed (idempotence) ----------------------------------
    const { error: markErr } = await supabase.rpc("mark_webhook_processed", {
      p_event_id: event.id,
      p_event_type: event.type,
      p_payload: event as unknown as Record<string, unknown>,
    });
    if (markErr) {
      log("mark_webhook_processed RPC error", { error: markErr.message });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    log("Handler error", { error: err instanceof Error ? err.message : String(err) });
    // Return 500 so Stripe retries — the idempotence guard will deduplicate.
    return new Response(JSON.stringify({ error: "Handler failure" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================================
// Helpers
// ============================================================================

async function resolveUserId(
  supabase: ReturnType<typeof createClient>,
  stripe: Stripe,
  customerId: string | null,
): Promise<string | null> {
  if (!customerId) return null;

  // 1. Try via existing `subscriptions` row.
  const { data: viaRpc, error: rpcErr } = await supabase.rpc(
    "get_user_id_by_stripe_customer",
    { p_stripe_customer_id: customerId },
  );
  if (!rpcErr && viaRpc) return viaRpc as string;

  // 2. Fallback: resolve via Stripe customer email → Supabase auth user.
  try {
    const customer = await stripe.customers.retrieve(customerId);
    const email = (customer as Stripe.Customer).email ?? null;
    if (!email) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (error || !data) return null;
    return data.id as string;
  } catch (err) {
    log("resolveUserId fallback failed", { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

async function syncSubscription(
  supabase: ReturnType<typeof createClient>,
  stripe: Stripe,
  sub: Stripe.Subscription,
  customerId: string,
): Promise<void> {
  const userId = await resolveUserId(supabase, stripe, customerId);
  if (!userId) {
    log("Could not resolve user from customer", { customerId });
    return;
  }

  const { error } = await supabase.rpc("sync_stripe_subscription", {
    p_user_id: userId,
    p_stripe_customer_id: customerId,
    p_stripe_subscription_id: sub.id,
    p_stripe_price_id: priceIdFromSubscription(sub),
    p_plan: planFromSubscription(sub),
    p_status: sub.status,
    p_current_period_start: tsToIso(sub.current_period_start),
    p_current_period_end: tsToIso(sub.current_period_end),
    p_cancel_at_period_end: sub.cancel_at_period_end ?? false,
  });

  if (error) {
    log("sync_stripe_subscription RPC error", { error: error.message });
    throw error;
  }
  log("Subscription synced", { userId, subscriptionId: sub.id, status: sub.status });
}
